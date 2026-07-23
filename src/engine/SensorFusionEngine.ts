import {KALMAN, DISTANCE, CONFIDENCE} from '@/utils/constants';

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
      /**
       * Set this to false (or omit rssi/txPower entirely) when the caller has
       * no real BLE reading for this peer — e.g. v1's GPS-only flow, where
       * there's no BLE peripheral advertising yet. When false, RSSI-derived
       * confidence boosts and rotation-sweep refinement are skipped entirely
       * rather than fed placeholder numbers, which would otherwise silently
       * produce misleadingly high confidence scores. Defaults to true so
       * future real-BLE callers get the original behavior unchanged.
       */
  hasRealRSSI?: boolean;
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

  processPeerDetection(input: FusionInput): FusionOutput {
          const {peerId, rssi, txPower, userHeading, timestamp, peerLatitude, peerLongitude, myLatitude, myLongitude} = input;
          const hasRealRSSI = input.hasRealRSSI !== false;

        const hasGPS =
                  myLatitude !== undefined && myLatitude !== null &&
                  myLongitude !== undefined && myLongitude !== null &&
                  peerLatitude !== undefined && peerLatitude !== null &&
                  peerLongitude !== undefined && peerLongitude !== null;

        let filteredRSSI: number | null = null;
          let rssiDistance: number | null = null;

        if (hasRealRSSI) {
                  filteredRSSI = this.kalmanFilterRSSI(peerId, rssi);
                  rssiDistance = this.estimateDistance(filteredRSSI, txPower);
        }

        let bearing: number | null = null;
          let distance: number | null = null;
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
                  confidence = CONFIDENCE.GPS_WEIGHT +
                              (hasRealRSSI && filteredRSSI !== null ? CONFIDENCE.RSSI_WEIGHT * this.rssiConfidence(filteredRSSI) : 0);
                  method = 'gps';

            if (hasRealRSSI && filteredRSSI !== null && gpsDistance <= ROTATION_SWEEP_REFINEMENT_RADIUS_M) {
                        const sweep = this.processRotationSample(peerId, filteredRSSI, userHeading, timestamp);
                        if (sweep !== null) {
                                      bearing = this.blendBearings(gpsBearing, sweep.bearing, sweep.confidence);
                                      method = 'gps_refined';
                        }
            }
        } else if (hasRealRSSI && filteredRSSI !== null) {
                  distance = rssiDistance;
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

        const predictedEstimate = state.estimate;
          const predictedCovariance = state.errorCovariance + Q;

        const kalmanGain = predictedCovariance / (predictedCovariance + R);
          const updatedEstimate = predictedEstimate + kalmanGain * (rawRSSI - predictedEstimate);
          const updatedCovariance = (1 - kalmanGain) * predictedCovariance;

        this.rssiKalmanFilters.set(peerId, {
                  estimate: updatedEstimate,
                  errorCovariance: updatedCovariance,
        });

        return updatedEstimate;
  }

  private estimateDistance(filteredRSSI: number, txPower: number): number | null {
          if (filteredRSSI === 0 || txPower === 0) {
                    return null;
          }
          const n = this.getPathLossExponent(filteredRSSI);
          const ratio = (txPower - filteredRSSI) / (10 * n);
          const distance = Math.pow(10, ratio);
          return Math.max(0.5, Math.min(100, distance));
  }

  private getPathLossExponent(_filteredRSSI: number): number {
          return DISTANCE.PATH_LOSS_TYPICAL;
  }

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
          bearingToPeer = (bearingToPeer + 360) % 360;

        let relativeBearing = bearingToPeer - userHeading;
          relativeBearing = ((relativeBearing + 180) % 360) - 180;

        return relativeBearing;
  }

  private haversineDistance(myLat: number, myLng: number, peerLat: number, peerLng: number): number {
          const R = 6371000;
          const dLat = (peerLat - myLat) * (Math.PI / 180);
          const dLng = (peerLng - myLng) * (Math.PI / 180);

        const a =
                  Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(myLat * (Math.PI / 180)) * Math.cos(peerLat * (Math.PI / 180)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
  }

  private blendBearings(gpsBearing: number, sweepBearing: number, sweepConfidence: number): number {
          const weight = Math.max(0, Math.min(0.4, sweepConfidence));
          const gpsRad = gpsBearing * (Math.PI / 180);
          const sweepRad = sweepBearing * (Math.PI / 180);

        const x = (1 - weight) * Math.cos(gpsRad) + weight * Math.cos(sweepRad);
          const y = (1 - weight) * Math.sin(gpsRad) + weight * Math.sin(sweepRad);

        return Math.atan2(y, x) * (180 / Math.PI);
  }

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

        const cutoff = timestamp - 3000;
          const recentSamples = samples.filter(s => s.timestamp >= cutoff);
          this.rotationSweepSamples.set(peerId, recentSamples);

        if (recentSamples.length < 5) {
                  return null;
        }

        const headings = recentSamples.map(s => s.heading);
          const minHeading = Math.min(...headings);
          const maxHeading = Math.max(...headings);
          const coverage = maxHeading - minHeading;
          const wrapped = (minHeading + 360 - maxHeading) % 360;

        if (coverage < 90 && wrapped < 90) {
                  return null;
        }

        const peakSample = recentSamples.reduce((peak, current) =>
                  current.rssi > peak.rssi ? current : peak,
                                                    );

        this.lastSweepResults.set(peerId, {
                  peakRssi: peakSample.rssi,
                  peakHeading: peakSample.heading,
                  timestamp: peakSample.timestamp,
        });

        let relativeBearing = peakSample.heading - currentHeading;
          relativeBearing = ((relativeBearing + 180) % 360) - 180;

        const accuracyFactor = Math.min(coverage, wrapped, 360) / 360;
          const confidence = 0.5 + 0.3 * accuracyFactor;

        return {bearing: relativeBearing, confidence};
  }

  private rssiConfidence(filteredRSSI: number): number {
          if (filteredRSSI >= -60) return 1.0;
          if (filteredRSSI >= -75) return 0.8;
          if (filteredRSSI >= -85) return 0.5;
          if (filteredRSSI >= -95) return 0.3;
          return 0.1;
  }

  resetPeer(peerId: string): void {
          this.rssiKalmanFilters.delete(peerId);
          this.lastSweepResults.delete(peerId);
          this.rotationSweepSamples.delete(peerId);
  }

  resetAll(): void {
          this.rssiKalmanFilters.clear();
          this.lastSweepResults.clear();
          this.rotationSweepSamples.clear();
  }
}

export const SensorFusionEngine = new SensorFusionEngineClass();
