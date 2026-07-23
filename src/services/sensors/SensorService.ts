import CompassHeading from 'react-native-compass-heading';
import {accelerometer, setUpdateIntervalForType, SensorTypes} from 'react-native-sensors';
import type {Subscription} from 'rxjs';

import {logger} from '@/utils/logger';
import {SENSORS} from '@/utils/constants';

const TAG = 'SensorService';
const COMPASS_DEGREE_UPDATE_RATE = 1;

export interface HeadingData {
    heading: number;
    accuracy: number;
    timestamp: number;
}

export interface MotionData {
    isMoving: boolean;
    acceleration: number;
    timestamp: number;
}

type HeadingCallback = (data: HeadingData) => void;
type MotionCallback = (data: MotionData) => void;

class SensorServiceClass {
    private headingCallback: HeadingCallback | null = null;
    private motionCallback: MotionCallback | null = null;
    private compassStarted = false;
    private headingThrottleMs: number = SENSORS.HEADING_UPDATE_RATE_SLOW_MS;
    private lastHeadingEmitAt = 0;
    private motionSubscription: Subscription | null = null;

  subscribeHeading(intervalMs: number, callback: HeadingCallback): void {
        this.headingCallback = callback;
        this.headingThrottleMs = intervalMs;

      if (!this.compassStarted) {
              CompassHeading.start(COMPASS_DEGREE_UPDATE_RATE, this.handleCompassUpdate);
              this.compassStarted = true;
              logger.info(TAG, 'Compass heading started');
      }
  }

  updateHeadingInterval(intervalMs: number): void {
        this.headingThrottleMs = intervalMs;
  }

  private handleCompassUpdate = ({heading, accuracy}: {heading: number; accuracy: number}): void => {
        const now = Date.now();
        if (now - this.lastHeadingEmitAt < this.headingThrottleMs) {
                return;
        }
        this.lastHeadingEmitAt = now;
        this.headingCallback?.({heading, accuracy, timestamp: now});
  };

  subscribeMotion(intervalMs: number, callback: MotionCallback): void {
        this.motionCallback = callback;

      if (this.motionSubscription) {
              this.motionSubscription.unsubscribe();
      }

      setUpdateIntervalForType(SensorTypes.accelerometer, intervalMs);

      this.motionSubscription = accelerometer.subscribe(({x, y, z}) => {
              const totalAccel = Math.sqrt(x * x + y * y + z * z);
              const isMoving = Math.abs(totalAccel - 9.81) > SENSORS.MOTION_THRESHOLD;
              this.motionCallback?.({isMoving, acceleration: totalAccel, timestamp: Date.now()});
      });

      logger.info(TAG, `Motion subscription started at ${intervalMs}ms interval`);
  }

  unsubscribeAll(): void {
        if (this.compassStarted) {
                CompassHeading.stop();
                this.compassStarted = false;
        }
        if (this.motionSubscription) {
                this.motionSubscription.unsubscribe();
                this.motionSubscription = null;
        }
        this.headingCallback = null;
        this.motionCallback = null;
        logger.info(TAG, 'All sensor subscriptions stopped');
  }
}

export const SensorService = new SensorServiceClass();
