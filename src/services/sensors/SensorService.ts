import {logger} from '@/utils/logger';
import {SENSORS} from '@/utils/constants';

const TAG = 'SensorService';

export interface HeadingData {
  heading: number; // 0-360 degrees
  accuracy: number; // accuracy in degrees (lower = better)
  timestamp: number;
}

export interface MotionData {
  isMoving: boolean;
  acceleration: number; // m/s²
  timestamp: number;
}

export interface GPSData {
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  timestamp: number;
}

type HeadingCallback = (data: HeadingData) => void;
type MotionCallback = (data: MotionData) => void;
type GPSCallback = (data: GPSData) => void;

class SensorServiceClass {
  private headingSubscribed = false;
  private motionSubscribed = false;
  private gpsSubscribed = false;

  private headingCallback: HeadingCallback | null = null;
  private motionCallback: MotionCallback | null = null;
  private gpsCallback: GPSCallback | null = null;

  private headingInterval: ReturnType<typeof setInterval> | null = null;
  private motionInterval: ReturnType<typeof setInterval> | null = null;
  private gpsInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Subscribe to device heading (magnetometer + compass).
   * In production, this uses react-native-sensors to create an observable
   * from the magnetometer, combined with accelerometer for tilt compensation.
   */
  subscribeHeading(intervalMs: number, callback: HeadingCallback): void {
    this.headingCallback = callback;
    this.headingSubscribed = true;

    if (this.headingInterval) {
      clearInterval(this.headingInterval);
    }

    // Simulated heading stream — actual implementation uses:
    // import { magnetometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
    // setUpdateIntervalForType(SensorTypes.magnetometer, intervalMs);
    // magnetometer.subscribe(({x, y, z}) => {
    //   const heading = Math.atan2(y, x) * (180 / Math.PI);
    //   callback({ heading: (heading + 360) % 360, accuracy: 5, timestamp: Date.now() });
    // });
    this.headingInterval = setInterval(() => {
      if (this.headingCallback) {
        this.headingCallback({
          heading: Math.random() * 360, // placeholder - real sensor data
          accuracy: 5,
          timestamp: Date.now(),
        });
      }
    }, intervalMs);

    logger.info(TAG, `Heading subscription started at ${intervalMs}ms interval`);
  }

  /**
   * Subscribe to motion detection (accelerometer).
   */
  subscribeMotion(intervalMs: number, callback: MotionCallback): void {
    this.motionCallback = callback;
    this.motionSubscribed = true;

    if (this.motionInterval) {
      clearInterval(this.motionInterval);
    }

    // Simulated motion stream — actual implementation uses:
    // import { accelerometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
    // setUpdateIntervalForType(SensorTypes.accelerometer, intervalMs);
    // accelerometer.subscribe(({x, y, z}) => {
    //   const totalAccel = Math.sqrt(x*x + y*y + z*z);
    //   const isMoving = Math.abs(totalAccel - 9.81) > SENSORS.MOTION_THRESHOLD;
    //   callback({ isMoving, acceleration: totalAccel, timestamp: Date.now() });
    // });
    this.motionInterval = setInterval(() => {
      if (this.motionCallback) {
        this.motionCallback({
          isMoving: false,
          acceleration: 9.81,
          timestamp: Date.now(),
        });
      }
    }, intervalMs);

    logger.info(TAG, `Motion subscription started at ${intervalMs}ms interval`);
  }

  /**
   * Subscribe to GPS position updates.
   */
  subscribeGPS(intervalMs: number, callback: GPSCallback): void {
    this.gpsCallback = callback;
    this.gpsSubscribed = true;

    // In production, uses:
    // import { Geolocation } from '@react-native-community/geolocation';
    // or react-native-sensors' location observable
    // Geolocation.watchPosition({ enableHighAccuracy: true, interval: intervalMs }, callback);
    logger.info(TAG, `GPS subscription started at ${intervalMs}ms interval`);
  }

  updateHeadingInterval(intervalMs: number): void {
    if (this.headingSubscribed && this.headingCallback) {
      this.subscribeHeading(intervalMs, this.headingCallback);
    }
  }

  unsubscribeAll(): void {
    if (this.headingInterval) {
      clearInterval(this.headingInterval);
      this.headingInterval = null;
    }
    if (this.motionInterval) {
      clearInterval(this.motionInterval);
      this.motionInterval = null;
    }
    if (this.gpsInterval) {
      clearInterval(this.gpsInterval);
      this.gpsInterval = null;
    }

    this.headingSubscribed = false;
    this.motionSubscribed = false;
    this.gpsSubscribed = false;
    this.headingCallback = null;
    this.motionCallback = null;
    this.gpsCallback = null;

    logger.info(TAG, 'All sensor subscriptions stopped');
  }
}

export const SensorService = new SensorServiceClass();