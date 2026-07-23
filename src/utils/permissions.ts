import {Platform, PermissionsAndroid, Alert, Linking} from 'react-native';
import {logger} from '@/utils/logger';

type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'unavailable';

export async function requestBluetoothPermissions(): Promise<PermissionStatus> {
  if (Platform.OS === 'ios') {
    // iOS handles BLE permissions via Info.plist — no runtime prompt needed
    return 'granted';
  }

  if (Platform.OS === 'android' && Number(Platform.Version) >= 31) {
    try {
      const scanResult = await PermissionsAndroid.request(
        'android.permission.BLUETOOTH_SCAN' as any,
        {
          title: 'Bluetooth Scan Permission',
          message: 'VibeRadar needs to scan for nearby friends via Bluetooth.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      const connectResult = await PermissionsAndroid.request(
        'android.permission.BLUETOOTH_CONNECT' as any,
        {
          title: 'Bluetooth Connect Permission',
          message: 'VibeRadar needs to connect to nearby friends via Bluetooth.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      if (scanResult === 'granted' && connectResult === 'granted') {
        return 'granted';
      }
      return 'denied';
    } catch (e) {
      logger.error('Permissions', 'Bluetooth permission request failed', e as Error);
      return 'unavailable';
    }
  }

  // Android < 12: ACCESS_FINE_LOCATION is required for BLE scanning
  try {
    const result = await PermissionsAndroid.request(
      'android.permission.ACCESS_FINE_LOCATION',
      {
        title: 'Location Permission',
        message:
          'VibeRadar needs location access to find nearby friends via Bluetooth (required by Android).',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return result === 'granted' ? 'granted' : 'denied';
  } catch (e) {
    logger.error('Permissions', 'Location permission request failed', e as Error);
    return 'unavailable';
  }
}

export async function requestLocationPermission(): Promise<PermissionStatus> {
  if (Platform.OS === 'ios') {
    // iOS handles via Info.plist (NSLocationWhenInUseUsageDescription)
    return 'granted';
  }

  if (Platform.OS === 'android' && Number(Platform.Version) >= 31) {
    // Android 12+ — BLE permissions don't need location, but GPS does
    try {
      const result = await PermissionsAndroid.request(
        'android.permission.ACCESS_FINE_LOCATION',
        {
          title: 'Location Permission',
          message:
            'VibeRadar uses GPS to show precise friend locations when available.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      return result === 'granted' ? 'granted' : 'denied';
    } catch (e) {
      logger.error('Permissions', 'Location permission request failed', e as Error);
      return 'unavailable';
    }
  }

  // Android < 12 — already handled in bluetooth permissions
  return 'granted';
}

export function showPermissionHelpAlert(permission: string): void {
  Alert.alert(
    'Permission Required',
    `VibeRadar needs ${permission} permission to find your friends. You can enable it in Settings.`,
    [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Open Settings', onPress: () => Linking.openSettings()},
    ],
  );
}
