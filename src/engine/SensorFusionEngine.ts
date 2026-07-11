import {logger} from '@/utils/logger';
import {KALMAN, DISTANCE, CONFIDENCE} from '@/utils/constants';

const TAG = 'SensorFusionEngine';

export interface FusionInput {
  peerId: string;
  rssi: number;
  txPower: number;
  userHeading: number;
  peerLatitude?: number;
  peerLongitude?: number;
  myLatitude?: number;
  myLongitude?: number;
  timestamp: number;
}

export interface FusionOutput {
  peerId: string;
  bearing: number | null; // degrees relative to user heading (0 = straight ahead)
  distance: number | null; // meters
  confidence: number; // 0.0 - 1.0
  method: 'gps' | 'rssi_comparison' | 'rotation_sweep' | 'unknown';
}

/** Kalman filter state for RSSI smoothing */
interface KalmanState {
  estimate: number;
  errorCovariance: number;
}

class SensorFusionEngineClass {
  private rssiKalmanFilters: Map<string, KalmanState> = new Map();
  private lastSweepResults: Map<string, {peakRssi: number; peakHeading: number; timestamp: number}> = new Map();
  private rotationSweepSamples: Map<string, {heading: number; rssi: number; timestamp: number}[]> = new Map();

  /**
   * Process a single peer detection event and compute bearing + distance.
   */
  processPeerDetection(input: FusionInput): FusionOutput {
    const {peerId, rssi, txPower, userHeading, timestamp, peerLatitude, peerLongitude, myLatitude, myLongitude} = input;

    // 1. Smooth RSSI with Kalman filter
    const filteredRSSI = this.kalmanFilterRSSI(peerId, rssi);

    // 2. Estimate distance from filtered RSSI
    const distance = this.estimateDistance(filteredRSSI, txPower);

    // 3. Compute bearing and confidence
    let bearing: number | null = null;
    let confidence = 0.0;
    let method: FusionOutput['method'] = 'unknown';

    // Try GPS method first (highest accuracy)
    if (myLatitude !== undefined && myLatitude !== null &&
        peerLatitude !== undefined && peerLatitude !== null &&
        myLongitude !== undefined && myLongitude !== null &&
        peerLongitude !== undefined && peerLongitude !== null) {
      bearing = this.computeBearingFromGPS(
        myLatitude, myLongitude,
        peerLatitude, peerLongitude,
        userHeading,
      );
      confidence = CONFIDENCE.GPS_WEIGHT + CONFIDENCE.RSSI_WEIGHT * this.rssiConfidence(filteredRSSI);
      method = 'gps';
    } else {
      // Try rotation sweep method
      const sweepResult = this.processRotationSample(peerId, rssi, userHeading, timestamp);
      if (sweepResult !== null) {
        bearing = sweepResult.bearing;
        confidence = CONFIDENCE.RSSI_WEIGHT * sweepResult.confidence;
        method = 'rotation_sweep';
      }
    }

    // Clamp confidence
    confidence = Math.max(0, Math.min(1, confidence));

    return {
      peerId,
      bearing,
      distance: Math.round(distance * 10) / 10, // round to 1 decimal
      confidence: Math.round(confidence * 100) / 100,
      method,
    };
  }

  /**
   * Kalman filter for RSSI smoothing.
   * State: x = estimatedRSSI
   * Measurement: z = rawRSSI
   */
  private kalmanFilterRSSI(peerId: string, rawRSSI: number): number {
    if (!this.rssiKalmanFilters.has(peerId)) {
      this.rssiKalmanFilters.set(peerId, {
        estimate: rawRSSI,
        errorCovariance: 1.0,
      });
      return rawRSSI;
    }

    const state = this.rssiKalmanFilters.get(peerId)!;
    const Q = KALMAN.RSSI_PROCESS_NOISE_Q;
    const R = KALMAN.RSSI_MEASUREMENT_NOISE_R;

    // Predict
    const predictedEstimate = state.estimate;
    const predictedCovariance = state.errorCovariance + Q;

    // Update
    const kalmanGain = predictedCovariance / (predictedCovariance + R);
    const updatedEstimate = predictedEstimate + kalmanGain * (rawRSSI - predictedEstimate);
    const updatedCovariance = (1 - kalmanGain) * predictedCovariance;

    this.rssiKalmanFilters.set(peerId, {
      estimate: updatedEstimate,
      errorCovariance: updatedCovariance,
    });

    return updatedEstimate;
  }

  /**
   * Log-distance path loss model for RSSI-to-distance conversion.
   */
  private estimateDistance(filteredRSSI: number, txPower: number): number {
    // Choose path-loss exponent based on RSSI variance (proxy for crowd density)
    const n = this.getPathLossExponent(filteredRSSI);

    if (filteredRSSI === 0 || txPower === 0) {
      return -1; // unknown
    }

    const ratio = (txPower - filteredRSSI) / (10 * n);
    const distance = Math.pow(10, ratio);

    // Clamp to reasonable bounds (0.5m to 100m)
    return Math.max(0.5, Math.min(100, distance));
  }

  /**
   * Estimate crowd density from RSSI variance to select path-loss exponent.
   * Higher variance → more multipath → denser environment.
   */
  private getPathLossExponent(_filteredRSSI: number): number {
    // In production, this analyzes RSSI variance over a sliding window.
    // For now, use a default value.
    return DISTANCE.PATH_LOSS_TYPICAL;
  }

  /**
   * Compute relative bearing to a peer using GPS coordinates.
   */
  private computeBearingFromGPS(
    myLat: number,
    myLng: number,
    peerLat: number,
    peerLng: number,
    userHeading: number,
  ): number {
    const dLng = (peerLng - myLng) * (Math.PI / 180);
    const myLatRad = myLat * (Math.PI / 180);
    const peerLatRad = peerLat * (Math.PI / 180);

    const y = Math.sin(dLng) * Math.cos(peerLatRad);
    const x = Math.cos(myLatRad) * Math.sin(peerLatRad) -
              Math.sin(myLatRad) * Math.cos(peerLatRad) * Math.cos(dLng);

    let bearingToPeer = Math.atan2(y, x) * (180 / Math.PI);
    bearingToPeer = (bearingToPeer + 360) % 360; // Normalize to 0-360

    // Compute relative bearing (0 = straight ahead)
    let relativeBearing = bearingToPeer - userHeading;
    relativeBearing = ((relativeBearing + 180) % 360) - 180; // Normalize to -180..180

    return relativeBearing;
  }

  /**
   * Rotation-sweep method: collect RSSI samples at different headings while
   * the user rotates their phone. Peak RSSI direction ≈ bearing to peer.
   */
  processRotationSample(
    peerId: string,
    rssi: number,
    heading: number,
    timestamp: number,
  ): {bearing: number; confidence: number} | null {
    if (!this.rotationSweepSamples.has(peerId)) {
      this.rotationSweepSamples.set(peerId, []);
    }

    const samples = this.rotationSweepSamples.get(peerId)!;
    samples.push({heading, rssi, timestamp});

    // Keep last 3 seconds of samples
    const cutoff = timestamp - 3000;
    const recentSamples = samples.filter(s => s.timestamp >= cutoff);
    this.rotationSweepSamples.set(peerId, recentSamples);

    // Need at least 5 samples across a range of headings to estimate peak
    if (recentSamples.length < 5) {
      return null;
    }

    // Find the sample range to verify sufficient rotation
    const headings = recentSamples.map(s => s.heading);
    const minHeading = Math.min(...headings);
    const maxHeading = Math.max(...headings);
    const coverage = maxHeading - minHeading;
    const wrapped = (minHeading + 360 - maxHeading) % 360; // handle 0/360 wrap

    if (coverage < 90 && wrapped < 90) {
      return null; // Not enough rotation
    }

    // Find peak RSSI sample
    const peakSample = recentSamples.reduce((peak, current) =>
      current.rssi > peak.rssi ? current : peak,
    );

    // Peak RSSI heading ≈ direction to peer
    // Accuracy improves with more rotation
    const accuracyFactor = Math.min(coverage, wrapped, 360) / 360;
    const confidence = 0.5 + 0.3 * accuracyFactor;
    const bearing = peakSample.heading;

    return {bearing, confidence};
  }

  /**
   * Calculate confidence contribution from RSSI signal strength.
   * Stronger signals = higher confidence.
   */
  private rssiConfidence(filteredRSSI: number): number {
    if (filteredRSSI >= -60) return 1.0; // Excellent
    if (filteredRSSI >= -75) return 0.8; // Good
    if (filteredRSSI >= -85) return 0.5; // Fair
    if (filteredRSSI >= -95) return 0.3; // Weak
    return 0.1; // Very weak
  }

  /**
   * Reset Kalman filters and sweep data for a peer (e.g., when they disconnect).
   */
  resetPeer(peerId: string): void {
    this.rssiKalmanFilters.delete(peerId);
    this.lastSweepResults.delete(peerId);
    this.rotationSweepSamples.delete(peerId);
  }

  /**
   * Clear all state (e.g., when group is left).
   */
  resetAll(): void {
    this.rssiKalmanFilters.clear();
    this.lastSweepResults.clear();
    this.rotationSweepSamples.clear();
  }
}

export const SensorFusionEngine = new SensorFusionEngineClass();