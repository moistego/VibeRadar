# VibeRadar — React Native App

Offline radar compass for finding friends at festivals. No cellular or internet required.

## Architecture

The app follows a **6-layer architecture**:

```
Presentation ──► State ──► Services ──► Engine ──► Persistence ──► BLE
```

| Layer | Directory | Responsibility |
|-------|-----------|----------------|
| **Presentation** | `src/presentation/` | Screens, components, theme (SVG radar UI) |
| **State** | `src/state/` | Redux Toolkit store, slices, selectors |
| **Services** | `src/services/` | BLE (scan/advertise), Sensors (heading/motion/GPS) |
| **Engine** | `src/engine/` | Sensor Fusion (Kalman filter, distance, bearing) |
| **Persistence** | `src/services/persistence/` | WatermelonDB local database |
| **BLE** | Native via `react-native-ble-plx` | Device discovery, advertising, GATT connections |

## Key Libraries

- `react-native-ble-plx` — BLE advertising, scanning, GATT connections
- `react-native-sensors` — Magnetometer, accelerometer, gyroscope
- `react-native-svg` — Hardware-accelerated SVG radar rendering
- `@reduxjs/toolkit` + `redux-persist` — State management with offline persistence
- `@react-navigation/native` — Screen navigation
- `@nozbe/watermelondb` — Local SQLite persistence for groups and members
- `react-native-compass-heading` — Magnetometer-to-heading conversion

## Project Structure

```
vibradar-app/
├── index.js                    # RN entry point
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── babel.config.js             # Babel + module resolver
├── metro.config.js             # Metro bundler config
└── src/
    ├── app/                    # App shell + navigation
    │   ├── App.tsx
    │   └── navigation/
    ├── presentation/           # UI layer
    │   ├── screens/            # RadarScreen, FriendsList, Settings
    │   ├── components/
    │   │   ├── radar/          # RadarCompass, FriendDot, ConfidenceIndicator
    │   │   └── common/         # Button, Card
    │   └── theme/              # colors, typography, spacing
    ├── state/                  # Redux state management
    │   ├── store.ts
    │   ├── slices/             # user, groups, peers, sensors
    │   └── selectors/          # peerSelectors, groupSelectors
    ├── services/               # Business logic services
    │   ├── ble/                # BleService, BleAdvertiser, BleScanner
    │   ├── sensors/            # SensorService (heading, motion, GPS)
    │   └── persistence/        # WatermelonDB models + schema
    ├── engine/                 # Core computation
    │   └── SensorFusionEngine.ts  # Kalman filter, distance, bearing
    └── utils/                  # Constants, logger, permissions
```

## Getting Started

### Prerequisites

- Node.js 18+
- React Native CLI setup (Xcode for iOS, Android Studio for Android)
- CocoaPods (`sudo gem install cocoapods`)

### Installation

```bash
# Install JS dependencies
cd vibradar-app
npm install

# iOS only — install Pods
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Configuration

1. **iOS:** Add these to `Info.plist` for BLE background modes:
   ```xml
   <key>UIBackgroundModes</key>
   <array>
     <string>bluetooth-central</string>
     <string>bluetooth-peripheral</string>
   </array>
   <key>NSBluetoothAlwaysUsageDescription</key>
   <string>VibeRadar uses Bluetooth to find nearby friends.</string>
   <key>NSLocationWhenInUseUsageDescription</key>
   <string>VibeRadar uses GPS to show precise friend locations.</string>
   ```

2. **Android:** Add to `AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.BLUETOOTH" />
   <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
   <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
   <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
   <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
   <uses-permission android:name="android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE" />
   ```

## Phase 1 Development Tasks

- [x] Project scaffold
- [ ] BLE advertising (iOS + Android)
- [ ] BLE scanning (iOS + Android)
- [ ] GATT data exchange
- [ ] Magnetometer heading stream
- [ ] Basic "friend detected" indicator

## License

Proprietary — VibeRadar © 2026