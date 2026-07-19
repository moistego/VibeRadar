import {logger} from '@/utils/logger';
import {KALMAN, DISTANCE, CONFIDENCE} from '@/utils/constants';

const TAG = 'SensorFusionEngine';

// Once GPS puts a peer within this range, rotation-sweep is used only to
// refine the arrow, never as the sole source of truth. Outside this range,
// rotation-sweep RSSI data is too noisy at festival scale to be meaningful
// on its own, so we suppress it and rely on GPS + a "searching" state.
const ROTATION_SWEEP_REFINEMENT_RADIUS_M = 50;

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
  distance: number | null; // meters, null = unknown
  confidence: number; // 0.0 - 1.0
  method: 'gps' | 'rssi_comparison' | 'rotation_sweep' | 'gps_refined' | 'unknown';
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
     *
     * Priority order:
     *   1. GPS bearing (accurate, works at any range, needs lat/lng on both sides)
     *   2. If GPS says the peer is close (<= ROTATION_SWEEP_REFINEMENT_RADIUS_M),
     *      blend in a rotation-sweep sample for short-range fine-tuning.
     *   3. If GPS is unavailable entirely, fall back to rotation-sweep alone,
     *      clearly flagged with lower confidence since it's the weaker signal.
     */
  processPeerDetection(input: FusionInput): FusionOutput {
        const {peerId, rssi, txPower, userHeading, timestamp, peerLatitude, peerLongitude, myLatitude, myLongitude} = input;

      // 1. Smooth RSSI with Kalman filter
      const filteredRSSI = this.kalmanFilterRSSI(peerId, rssi);

      // 2. Estimate distance from filtered RSSI (BLE-only distance, used as a
      //    fallback / cross-check — GPS distance is preferred when available)
      const rssiDistance = this.estimateDistance(filteredRSSI, txPower);

      const hasGPS =
              myLatitude !== undefined && myLatitude !== null &&
              myLongitude !== undefined && myLongitude !== null &&
              peerLatitude !== undefined && peerLatitude !== null &&
              peerLongitude !== undefined && peerLongitude !== null;

      let bearing: number | null = null;
        let distance: number | null = rssiDistance;
        let confidence = 0.0;
        let method: FusionOutput['method'] = 'unknown';

      if (hasGPS) {
              const gpsBearing = this.computeBearingFromGPS(
                        myLatitude!, myLongitude!,
                        peerLatitude!, peerLongitude!,
                        userHeading,
                      );
              const gpsDistance = this.haversineDistance(myLatitude!, myLongitude!, peerLatitude!, peerLongitude!);

          bearing = gpsBearing;
              distance = gpsDistance;
              confidence = CONFIDENCE.GPS_WEIGHT + CONFIDENCE.RSSI_WEIGHT * this.rssiConfidence(filteredRSSI);
              method = 'gps';

          // Within short range, let a rotation-sweep sample nudge the bearing
          // for finer precision ("last 50 feet"), but never let it override GPS
          // as the source of truth, and never let it run unbounded.
          if (gpsDistance <= ROTATION_SWEEP_REFINEMENT_RADIUS_M) {
                    const sweep = this.processRotationSample(peerId, filteredRSSI, userHeading, timestamp);
                    if (sweep !== null) {
                                // sweep.bearing is already relative-to-current-heading (see fix below)
                      bearing = this.blendBearings(gpsBearing, sweep.bearing, sweep.confidence);
                                method = 'gps_refined';
                    }
          }
      } else {
              // No GPS at all — fall back to rotation-sweep, clearly weaker signal.
          const sweep = this.processRotationSample(peerId, filteredRSSI, userHeading, timestamp);
              if (sweep !== null) {
                        bearing = sweep.bearing;
                        confidence = CONFIDENCE.RSSI_WEIGHT * sweep.confidence;
                        method = 'rotation_sweep';
              }
      }

      confidence = Math.max(0, Math.min(1, confidence));

      return {
              peerId,
              bearing: bearing === null ? null : Math.round(bearing * 10) / 10,
              distance: distance === null ? null : Math.round(distance * 10) / 10,
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
     * Returns null (not -1) when it genuinely can't be estimated, so callers
     * can rely on standard null-checks instead of a magic sentinel value.
     */
  private estimateDistance(filteredRSSI: number, txPower: number): number | null {
        if (filteredRSSI === 0 || txPower === 0) {
                return null;
        }

      const n = this.getPathLossExponent(filteredRSSI);
        const ratio = (txPower - filteredRSSI) / (10 * n);
        const distance = Math.pow(10, ratio);

      // Clamp to reasonable bounds (0.5m to 100m) — BLE RSSI is unreliable
      // outside this range anyway, especially in RF-dense environments.
      return Math.max(0.5, Math.min(100, distance));
  }

  /**
     * Estimate crowd density from RSSI variance to select path-loss exponent.
     * Higher variance -> more multipath -> denser environment.
     */
  private getPathLossExponent(_filteredRSSI: number): number {
        // TODO: analyze RSSI variance over a sliding window and pick a higher
      // exponent in dense/noisy conditions (festivals). Using default for now.
      return DISTANCE.PATH_LOSS_TYPICAL;
  }

  /**
     * Compute relative bearing to a peer using GPS coordinates.
     * Returns degrees relative to the user's current heading (0 = straight ahead).
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

      let relativeBearing = bearingToPeer - userHeading;
        relativeBearing = ((relativeBearing + 180) % 360) - 180; // Normalize to -180..180

      return relativeBearing;
  }

  /**
     * Great-circle distance between two GPS points, in meters.
     */
  private haversineDistance(myLat: number, myLng: number, peerLat: number, peerLng: number): number {
        const R = 6371000; // Earth radius in meters
      const dLat = (peerLat - myLat) * (Math.PI / 180);
        const dLng = (peerLng - myLng) * (Math.PI / 180);
        const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(myLat * (Math.PI / 180)) * Math.cos(peerLat * (Math.PI / 180)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
  }

  /**
     * Blend a GPS-derived bearing with a short-range rotation-sweep bearing.
     * Weighted toward GPS since it's the more trustworthy signal; the sweep
     * only nudges the result when it has reasonable confidence.
     */
  private blendBearings(gpsBearing: number, sweepBearing: number, sweepConfidence: number): number {
        const weight = Math.max(0, Math.min(0.4, sweepConfidence)); // sweep never dominates
      // Blend on the unit circle to handle wraparound correctly (e.g. -179 vs 179)
      const gpsRad = gpsBearing * (Math.PI / 180);
        const sweepRad = sweepBearing * (Math.PI / 180);
        const x = (1 - weight) * Math.cos(gpsRad) + weight * Math.cos(sweepRad);
        const y = (1 - weight) * Math.sin(gpsRad) + weight * Math.sin(sweepRad);
        return Math.atan2(y, x) * (180 / Math.PI);
  }

  /**
     * Rotation-sweep method: collect RSSI samples at different headings while
     * the user rotates their phone. Peak RSSI direction ~= bearing to peer.
     *
     * FIX: previously returned the *absolute* compass heading of the peak
     * sample, but the FusionOutput contract requires a bearing *relative to
     * the user's current heading* (0 = straight ahead). If the user has kept
     * rotating since the peak sample was recorded, the old code pointed the
     * arrow at the wrong place. We now convert to relative bearing using the
     * heading passed in for *this* call (the user's current heading).
     */
  processRotationSample(
        peerId: string,
        rssi: number,
        currentHeading: number,
        timestamp: number,
      ): {bearing: number; confidence: number} | null {
        if (!this.rotationSweepSamples.has(peerId)) {
                this.rotationSweepSamples.set(peerId, []);
        }

      const samples = this.rotationSweepSamples.get(peerId)!;
        samples.push({heading: currentHeading, rssi, timestamp});

      // Keep last 3 seconds of samples
      const cutoff = timestamp - 3000;
        const recentSamples = samples.filter(s => s.timestamp >= cutoff);
        this.rotationSweepSamples.set(peerId, recentSamples);

      // Need at least 5 samples across a range of headings to estimate peak
      if (recentSamples.length < 5) {
              return null;
      }

      // Verify sufficient rotation happened to trust a peak
      const headings = recentSamples.map(s => s.heading);
        const minHeading = Math.min(...headings);
        const maxHeading = Math.max(...headings);
        const coverage = maxHeading - minHeading;
        const wrapped = (minHeading + 360 - maxHeading) % 360; // handle 0/360 wrap

      if (coverage < 90 && wrapped < 90) {
              return null; // Not enough rotation to trust a peak
      }

      // Find peak RSSI sample (absolute heading at which signal was strongest)
      const peakSample = recentSamples.reduce((peak, current) =>
              current.rssi > peak.rssi ? current : peak,
                                                  );

      this.lastSweepResults.set(peerId, {
              peakRssi: peakSample.rssi,
              peakHeading: peakSample.heading,
              timestamp: peakSample.timestamp,
      });

      // Convert the absolute peak heading into a bearing relative to the
      // user's CURRENT heading, matching the FusionOutput contract.
      let relativeBearing = peakSample.heading - currentHeading;
        relativeBearing = ((relativeBearing + 180) % 360) - 180;

      const accuracyFactor = Math.min(coverage, wrapped, 360) / 360;
        const confidence = 0.5 + 0.3 * accuracyFactor;

      return {bearing: relativeBearing, confidence};
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
