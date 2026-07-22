// BLE Constants
export const BLE = {
  SERVICE_UUID_PREFIX: 'D3B5A0F0',
  ADVERTISEMENT_INTERVAL_FOREGROUND_MS: 200,
  ADVERTISEMENT_INTERVAL_BACKGROUND_MS: 1000,
  SCAN_INTERVAL_FOREGROUND_MS: 5000,
  SCAN_INTERVAL_BACKGROUND_MS: 15000,
  GATT_CONNECT_RSSI_THRESHOLD: -80,
  RSSI_STALE_TIMEOUT_MS: 30000,
  PEER_TIMEOUT_MS: 120000,
  MAX_ADVERTISING_PAYLOAD_BYTES: 31,
  PROTOCOL_VERSION: 0x01,
} as const;

// Sensor Constants
export const SENSORS = {
  HEADING_UPDATE_RATE_FAST_MS: 100, // 10 Hz when peers detected
  HEADING_UPDATE_RATE_SLOW_MS: 1000, // 1 Hz when no peers
  MOTION_THRESHOLD: 0.5, // m/s² — above this = user is walking
  GPS_UPDATE_INTERVAL_MS: 1000,
  ROTATION_SWEEP_DURATION_MS: 3000,
} as const;

// Kalman Filter Tuning
export const KALMAN = {
  RSSI_PROCESS_NOISE_Q: 0.5,
  RSSI_MEASUREMENT_NOISE_R: 6.0,
  HEADING_PROCESS_NOISE_Q: 0.1,
  HEADING_MEASUREMENT_NOISE_R: 2.0,
} as const;

// Distance Estimation
export const DISTANCE = {
  TX_POWER_DEFAULT: -59, // Calibrated RSSI at 1m
  PATH_LOSS_FREE_SPACE: 2.0,
  PATH_LOSS_TYPICAL: 3.0,
  PATH_LOSS_DENSE: 4.0,
} as const;

// Confidence Scoring
export const CONFIDENCE = {
  HIGH_THRESHOLD: 0.8,
  MEDIUM_THRESHOLD: 0.5,
  LOW_THRESHOLD: 0.2,
  GPS_WEIGHT: 0.5,
  RSSI_WEIGHT: 0.3,
  RECENCY_WEIGHT: 0.2,
} as const;

// Group Management
export const GROUP = {
  MAX_MEMBERS: 50,
  SESSION_EXPIRY_HOURS: 48,
  PASSCODE_LENGTH: 6,
} as const;

// App-wide
export const APP = {
  NAME: 'VibeRadar',
  PRICE: 0.99,
  STORE_URLS: {
    iOS: 'https://apps.apple.com/app/viberadar',
    android: 'https://play.google.com/store/apps/details?id=com.viberadar',
  },
  MIN_IOS_VERSION: '16.0',
  MIN_ANDROID_VERSION: '28',
} as const;
