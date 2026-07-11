import React, {useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAppSelector, useAppDispatch} from '@/state/store';
import {selectActivePeers, selectHasPeers, selectPeersCount} from '@/state/selectors/peerSelectors';
import {selectHasActiveGroup, selectActiveGroup} from '@/state/selectors/groupSelectors';
import {colors, typography, spacing} from '@/presentation/theme';
import {SensorFusionEngine, type FusionInput, type FusionOutput} from '@/engine/SensorFusionEngine';
import {SensorService} from '@/services/sensors';
import {logger} from '@/utils/logger';
import {SENSORS} from '@/utils/constants';

const TAG = 'RadarScreen';

export const RadarScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const activePeers = useAppSelector(selectActivePeers);
  const hasPeers = useAppSelector(selectHasPeers);
  const peerCount = useAppSelector(selectPeersCount);
  const hasActiveGroup = useAppSelector(selectHasActiveGroup);
  const activeGroup = useAppSelector(selectActiveGroup);

  useEffect(() => {
    logger.info(TAG, 'Radar screen mounted');

    // Start sensor subscriptions
    SensorService.subscribeHeading(SENSORS.HEADING_UPDATE_RATE_FAST_MS, data => {
      // Update heading in Redux store
      logger.debug(TAG, `Heading: ${data.heading}° (accuracy: ${data.accuracy}°)`);
    });

    SensorService.subscribeMotion(SENSORS.HEADING_UPDATE_RATE_SLOW_MS, data => {
      logger.debug(TAG, `Moving: ${data.isMoving}, accel: ${data.acceleration.toFixed(2)} m/s²`);
    });

    return () => {
      SensorService.unsubscribeAll();
    };
  }, [dispatch]);

  const handleRefresh = useCallback(() => {
    // Force a scan refresh
    logger.info(TAG, 'Manual refresh triggered');
  }, []);

  return (
    <View style={styles.container}>
      {/* Radar Display Area */}
      <View style={styles.radarContainer}>
        {/* Placeholder for SVG Radar Compass component */}
        <View style={styles.radarCircle}>
          <Text style={styles.radarCenterText}>
            {hasPeers ? `${peerCount}` : '—'}
          </Text>
          <Text style={styles.radarLabel}>
            {hasPeers ? 'friends nearby' : 'no friends yet'}
          </Text>

          {/* Compass rose placeholder */}
          <View style={styles.compassRose}>
            <Text style={styles.compassText}>N</Text>
          </View>
        </View>
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Group</Text>
          <Text style={styles.statusValue}>
            {hasActiveGroup ? activeGroup?.name ?? 'Active' : 'None'}
          </Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Friends</Text>
          <Text style={styles.statusValue}>{peerCount}</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Mode</Text>
          <Text style={styles.statusValue}>Radar</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('FriendsList')}>
          <Text style={styles.actionButtonText}>Friends</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.refreshButton]}
          onPress={handleRefresh}>
          <Text style={styles.actionButtonText}>↻</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.actionButtonText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Hello Radar Header */}
      <View style={styles.helloContainer}>
        <Text style={styles.helloTitle}>Hello Radar</Text>
        <Text style={styles.helloSubtitle}>
          {hasActiveGroup
            ? 'Scanning for friends in your group...'
            : 'Create or join a group to find friends'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  radarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    position: 'relative',
  },
  radarCenterText: {
    ...typography.h1,
    color: colors.primary,
    fontSize: 48,
  },
  radarLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  compassRose: {
    position: 'absolute',
    top: -spacing.lg,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  compassText: {
    ...typography.label,
    color: colors.accent,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  statusValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    paddingVertical: spacing.sm + 2,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  refreshButton: {
    flex: 0.5,
  },
  actionButtonText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  helloContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
  },
  helloTitle: {
    ...typography.h2,
    color: colors.primary,
  },
  helloSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});