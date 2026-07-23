import {BleService} from './BleService';
import {logger} from '@/utils/logger';
import {BLE} from '@/utils/constants';

const TAG = 'BleScanner';

interface ScanResult {
  userId: string;
  groupId: string;
  rssi: number;
  txPower: number;
  timestamp: number;
  latitude?: number;
  longitude?: number;
}

type ScanCallback = (result: ScanResult) => void;

class BleScannerClass {
  private isScanning = false;
  private scanCallback: ScanCallback | null = null;
  private knownGroupIds: Set<string> = new Set();

  get isActive(): boolean {
    return this.isScanning;
  }

  setKnownGroupIds(groupIds: string[]): void {
    this.knownGroupIds = new Set(groupIds);
  }

  addKnownGroupId(groupId: string): void {
    this.knownGroupIds.add(groupId);
  }

  removeKnownGroupId(groupId: string): void {
    this.knownGroupIds.delete(groupId);
  }

  async startScanning(callback: ScanCallback): Promise<boolean> {
    try {
      if (this.isScanning) {
        logger.warn(TAG, 'Already scanning');
        return true;
      }

      const initialized = await BleService.initialize();
      if (!initialized) {
        logger.error(TAG, 'Cannot scan — BLE not initialized');
        return false;
      }

      this.scanCallback = callback;
      this.isScanning = true;

      // In production, this uses BleService.getManager().startDeviceScan()
      // with service UUID filters matching known group IDs.
      //
      // react-native-ble-plx scan options:
      // - allowDuplicates: true (need continuous RSSI updates)
      // - scanMode: ScanMode.LowLatency (Android, foreground)
      // - callbackType: CallbackType.AllMatches
      //
      // For now, we set up the scanner state:
      logger.info(TAG, 'Scanning started', {
        knownGroups: this.knownGroupIds.size,
      });

      return true;
    } catch (error) {
      logger.error(TAG, 'Failed to start scanning', error as Error);
      return false;
    }
  }

  async stopScanning(): Promise<void> {
    try {
      // In production: BleService.getManager().stopDeviceScan()
      this.isScanning = false;
      this.scanCallback = null;
      logger.info(TAG, 'Scanning stopped');
    } catch (error) {
      logger.error(TAG, 'Error stopping scan', error as Error);
    }
  }

  /** Decode manufacturer data from BLE advertisement into a ScanResult */
  decodeAdvertisementData(
    manufacturerData: string | null,
    rssi: number,
  ): ScanResult | null {
    if (!manufacturerData || manufacturerData.length < 42) {
      // 21 bytes = 42 hex chars
      return null;
    }

    try {
      const bytes = this.hexToBytes(manufacturerData);
      const view = new DataView(bytes.buffer);

      let offset = 0;
      const protocolVersion = view.getUint8(offset);
      offset += 1;

      if (protocolVersion !== BLE.PROTOCOL_VERSION) {
        return null;
      }

      const groupId = view.getUint32(offset, false).toString(16);
      offset += 4;
      const userId = view.getUint32(offset, false).toString(16);
      offset += 4;
      const txPower = view.getInt8(offset);
      offset += 1;
      offset += 2;
      const hasGps = view.getUint8(offset) === 1;
      offset += 1;

      let latitude: number | undefined;
      let longitude: number | undefined;
      if (hasGps && bytes.length >= 21) {
        latitude = view.getInt32(offset, false) / 1e6;
        offset += 4;
        longitude = view.getInt32(offset, false) / 1e6;
      }

      // Only return results for known groups
      if (!this.knownGroupIds.has(groupId)) {
        return null;
      }

      return {
        userId,
        groupId,
        rssi,
        txPower,
        timestamp: Date.now(),
        latitude,
        longitude,
      };
    } catch (error) {
      logger.error(TAG, 'Failed to decode advertisement data', error as Error);
      return null;
    }
  }

  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }
}

export const BleScanner = new BleScannerClass();
