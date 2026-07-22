import {BleManager, Device, State} from 'react-native-ble-plx';
import {logger} from '@/utils/logger';

const TAG = 'BleService';

export type BleState = 'poweredOn' | 'poweredOff' | 'unauthorized' | 'unknown';

class BleServiceClass {
  private manager: BleManager;
  private isInitialized = false;
  private onStateChangeCallback: ((state: BleState) => void) | null = null;
  private onPeerDiscoveredCallback: ((device: Device, rssi: number) => void) | null = null;

  constructor() {
    this.manager = new BleManager();
  }

  async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) {
        return true;
      }

      const state = await this.manager.state();
      if (state === State.PoweredOn) {
        this.isInitialized = true;
        logger.info(TAG, 'BLE initialized successfully');
        return true;
      }

      logger.warn(TAG, `BLE not powered on. State: ${state}`);
      return false;
    } catch (error) {
      logger.error(TAG, 'Failed to initialize BLE', error as Error);
      return false;
    }
  }

  async requestConnectionPriority(priority: 'low' | 'balanced' | 'high'): Promise<void> {
    // Android only: requests connection priority for BLE scanning
    // iOS handles this automatically via background modes
    logger.debug(TAG, `Connection priority requested: ${priority}`);
  }

  getManager(): BleManager {
    return this.manager;
  }

  setOnStateChange(callback: (state: BleState) => void): void {
    this.onStateChangeCallback = callback;
    this.manager.onStateChange(state => {
      const mapped: BleState =
        state === State.PoweredOn
          ? 'poweredOn'
          : state === State.PoweredOff
            ? 'poweredOff'
            : state === State.Unauthorized
              ? 'unauthorized'
              : 'unknown';
      callback(mapped);
    }, true);
  }

  setOnPeerDiscovered(callback: (device: Device, rssi: number) => void): void {
    this.onPeerDiscoveredCallback = callback;
  }

  async destroy(): Promise<void> {
    try {
      await this.manager.destroy();
      this.isInitialized = false;
      logger.info(TAG, 'BLE manager destroyed');
    } catch (error) {
      logger.error(TAG, 'Error destroying BLE manager', error as Error);
    }
  }
}

export const BleService = new BleServiceClass();
