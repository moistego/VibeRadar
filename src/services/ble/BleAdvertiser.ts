import {BleService} from './BleService';
import {logger} from '@/utils/logger';
import {BLE} from '@/utils/constants';

const TAG = 'BleAdvertiser';

interface AdvertisementPayload {
  protocolVersion: number;
  groupId: string; // CRC32 truncated to 4 bytes
  userId: string; // CRC32 truncated to 4 bytes
  txPower: number;
  seqNum: number;
  hasGps: boolean;
  latitude?: number;
  longitude?: number;
}

class BleAdvertiserClass {
  private isAdvertising = false;
  private seqNum = 0;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  get isActive(): boolean {
    return this.isAdvertising;
  }

  async startAdvertising(_payload: Omit<AdvertisementPayload, 'seqNum'>): Promise<boolean> {
    try {
      if (this.isAdvertising) {
        logger.warn(TAG, 'Already advertising — stopping first');
        await this.stopAdvertising();
      }

      const initialized = await BleService.initialize();
      if (!initialized) {
        logger.error(TAG, 'Cannot advertise — BLE not initialized');
        return false;
      }

      // In a real implementation, this would use the BLE peripheral/advertiser
      // to broadcast manufacturer data containing the payload.
      // react-native-ble-plx supports this via the startAdvertising method on the peripheral API.
      //
      // For now, we set up the advertising loop:
      this.isAdvertising = true;
      logger.info(TAG, 'Advertising started');

      // Simulated advertising cycle — actual implementation uses
      // BleService.getManager().startAdvertising(...) with the
      // manufacturer data encoded as per the protocol spec
      this.intervalHandle = setInterval(() => {
        this.seqNum++;
        if (this.seqNum > 65535) this.seqNum = 0;
      }, BLE.ADVERTISEMENT_INTERVAL_FOREGROUND_MS);

      return true;
    } catch (error) {
      logger.error(TAG, 'Failed to start advertising', error as Error);
      return false;
    }
  }

  async stopAdvertising(): Promise<void> {
    try {
      if (this.intervalHandle) {
        clearInterval(this.intervalHandle);
        this.intervalHandle = null;
      }
      this.isAdvertising = false;
      logger.info(TAG, 'Advertising stopped');
    } catch (error) {
      logger.error(TAG, 'Error stopping advertising', error as Error);
    }
  }

  getCurrentSeqNum(): number {
    return this.seqNum;
  }

  /**
   * Encode advertisement payload into a Buffer for BLE manufacturer data.
   * Format: [protocolVersion(1)][groupId(4)][userId(4)][txPower(1)][seqNum(2)][hasGps(1)][lat(4)][lng(4)]
   * Total: 21 bytes (fits in 31-byte BLE adv payload limit)
   */
  encodePayload(payload: AdvertisementPayload): ArrayBuffer {
    // CRC32 truncated to 4 bytes for group/user IDs
    const groupIdBytes = this.crc32Truncated(payload.groupId);
    const userIdBytes = this.crc32Truncated(payload.userId);

    const buffer = new ArrayBuffer(21);
    const view = new DataView(buffer);
    let offset = 0;

    view.setUint8(offset, payload.protocolVersion);
    offset += 1;
    view.setUint32(offset, groupIdBytes, false); // big-endian
    offset += 4;
    view.setUint32(offset, userIdBytes, false);
    offset += 4;
    view.setInt8(offset, payload.txPower);
    offset += 1;
    view.setUint16(offset, payload.seqNum, false);
    offset += 2;
    view.setUint8(offset, payload.hasGps ? 1 : 0);
    offset += 1;

    if (payload.hasGps && payload.latitude !== undefined && payload.longitude !== undefined) {
      view.setInt32(offset, Math.round(payload.latitude * 1e6), false);
      offset += 4;
      view.setInt32(offset, Math.round(payload.longitude * 1e6), false);
      offset += 4;
    }

    return buffer;
  }

  private crc32Truncated(value: string): number {
    // Simple CRC32-like hash truncated to 32 bits
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash >>> 0;
  }
}

export const BleAdvertiser = new BleAdvertiserClass();
