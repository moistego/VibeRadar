import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, TextInput, Switch, Alert} from 'react-native';
import {useAppSelector, useAppDispatch} from '@/state/store';
import {selectHasActiveGroup, selectActiveGroup} from '@/state/selectors/groupSelectors';
import {setOnboarded, resetUser} from '@/state/slices/userSlice';
import {colors, typography, spacing} from '@/presentation/theme';
import {requestBluetoothPermissions, requestLocationPermission} from '@/utils/permissions';

export const SettingsScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const hasActiveGroup = useAppSelector(selectHasActiveGroup);
  const activeGroup = useAppSelector(selectActiveGroup);
  const [displayName, setDisplayName] = useState('');
  const [preciseMode, setPreciseMode] = useState(false);
  const [backgroundScan, setBackgroundScan] = useState(true);

  const handleRequestPermissions = async () => {
    const btResult = await requestBluetoothPermissions();
    const locResult = await requestLocationPermission();

    if (btResult === 'granted' && locResult === 'granted') {
      Alert.alert('Permissions', 'All permissions granted!');
    } else {
      Alert.alert('Permissions', 'Some permissions were denied. VibeRadar needs Bluetooth and location permissions to find friends.');
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset App',
      'This will clear all your data. Are you sure?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => dispatch(resetUser()),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>

      {/* Group Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Group</Text>
        {hasActiveGroup ? (
          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{activeGroup?.name}</Text>
            <Text style={styles.groupPassphrase}>
              Passphrase: {activeGroup?.passphrase}
            </Text>
          </View>
        ) : (
          <Text style={styles.mutedText}>No active group. Create or join one from the radar screen.</Text>
        )}
      </View>

      {/* Sensor Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sensors</Text>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Precise GPS Mode</Text>
          <Switch
            value={preciseMode}
            onValueChange={setPreciseMode}
            trackColor={{false: colors.surfaceLight, true: colors.primaryDim}}
            thumbColor={preciseMode ? colors.primary : colors.textMuted}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Background Scanning</Text>
          <Switch
            value={backgroundScan}
            onValueChange={setBackgroundScan}
            trackColor={{false: colors.surfaceLight, true: colors.primaryDim}}
            thumbColor={backgroundScan ? colors.primary : colors.textMuted}
          />
        </View>
      </View>

      {/* Permissions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permissions</Text>
        <TouchableOpacity style={styles.button} onPress={handleRequestPermissions}>
          <Text style={styles.buttonText}>Check / Request Permissions</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.mutedText}>VibeRadar v1.0.0</Text>
        <Text style={styles.mutedText}>Find your friends at festivals — no signal needed.</Text>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleReset}>
          <Text style={[styles.buttonText, styles.dangerText]}>
            Reset App Data
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  row: {
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 6,
    padding: spacing.sm,
    color: colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  groupInfo: {
    marginTop: spacing.xs,
  },
  groupName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  groupPassphrase: {
    ...typography.mono,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  button: {
    backgroundColor: colors.surfaceLight,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  dangerButton: {
    borderColor: colors.error,
  },
  dangerText: {
    color: colors.error,
  },
  mutedText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
});