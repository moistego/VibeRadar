import React, {useEffect, useCallback, useRef} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAppSelector, useAppDispatch} from '@/state/store';
import {selectHasPeers, selectPeersCount} from '@/state/selectors/peerSelectors';
import {selectHasActiveGroup, selectActiveGroup} from '@/state/selectors/groupSelectors';
import {upsertPeer, clearPeers} from '@/state/slices/peersSlice';
import {colors, typography, spacing} from '@/presentation/theme';
import {SensorService} from '@/services/sensors';
import {AuthService} from '@/services/auth/AuthService';
import {LocationSyncService, PeerLocation} from '@/services/location/LocationSyncService';
import {SensorFusionEngine} from '@/engine/SensorFusionEngine';
import {logger} from '@/utils/logger';
import {SENSORS} from '@/utils/constants';

const TAG = 'RadarScreen';

export const RadarScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const hasPeers = useAppSelector(selectHasPeers);
  const peerCount = useAppSelector(selectPeersCount);
  const hasActiveGroup = useAppSelector(selectHasActiveGroup);
  const activeGroup = useAppSelector(selectActiveGroup);
  const currentHeadingRef = useRef<number>(0);

  const handlePeerLocations = useCallback(
    (peers: PeerLocation[]) => {
      const myPosition = LocationSyncService.getLatestPosition();
      dispatch(clearPeers());
      peers.forEach(peer => {
        const result = SensorFusionEngine.processPeerDetection({
          peerId: peer.userId,
          rssi: 0,
          txPower: 0,
          hasRealRSSI: false,
          userHeading: currentHeadingRef.current,
          peerLatitude: peer.latitude,
          peerLongitude: peer.longitude,
          myLatitude: myPosition ? myPosition.latitude : undefined,
          myLongitude: myPosition ? myPosition.longitude : undefined,
          timestamp: Date.now(),
        });

                    dispatch(
                      upsertPeer({
                        userId: peer.userId,
                        lastRSSI: 0,
                        lastHeading: currentHeadingRef.current,
                        bearing: result.bearing,
                        distance: result.distance,
                        confidence: result.confidence,
                        lastSeen: peer.updatedAt,
                        latitude: peer.latitude,
                        longitude: peer.longitude,
                        isConnected: true,
                      }),
                      );
      });
    },
    [dispatch],
    );

  useEffect(() => {
    logger.info(TAG, 'Radar screen mounted');

            SensorService.subscribeHeading(SENSORS.HEADING_UPDATE_RATE_SLOW_MS, data => {
              currentHeadingRef.current = data.heading;
            });

            SensorService.subscribeMotion(SENSORS.HEADING_UPDATE_RATE_SLOW_MS, () => {
              // Reserved for future battery-saving logic. Not driving behavior yet.
            });

            const userId = AuthService.getUserId();
    if (hasActiveGroup && activeGroup && userId) {
      LocationSyncService.startSync(activeGroup.id, userId, handlePeerLocations);
    } else {
      logger.warn(TAG, 'No active group or user - location sync not started');
    }

            return () => {
              SensorService.unsubscribeAll();
              LocationSyncService.stopSync();
              SensorFusionEngine.resetAll();
            };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveGroup, activeGroup ? activeGroup.id : null]);

  useEffect(() => {
    SensorService.updateHeadingInterval(
      hasPeers ? SENSORS.HEADING_UPDATE_RATE_FAST_MS : SENSORS.HEADING_UPDATE_RATE_SLOW_MS,
      );
  }, [hasPeers]);

  const handleRefresh = useCallback(() => {
    logger.info(TAG, 'Manual refresh triggered (no-op - realtime already active)');
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.radarContainer}>
        <View style={styles.radarCircle}>
          <Text style={styles.radarCenterText}>
            {hasPeers ? String(peerCount) : '\u2014'}
          </Text>
          <Text style={styles.radarLabel}>
            {hasPeers ? 'friends nearby' : 'no friends yet'}
          </Text>
          <View style={styles.compassRose}>
            <Text style={styles.compassText}>N</Text>
          </View>
        </View>
      </View>

      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Group</Text>
          <Text style={styles.statusValue}>
            {hasActiveGroup ? (activeGroup && activeGroup.name ? activeGroup.name : 'Active') : 'None'}
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

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('FriendsList')}>
          <Text style={styles.actionButtonText}>Friends</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.refreshButton]}
          onPress={handleRefresh}>
          <Text style={styles.actionButtonText}>{'\u21BB'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.actionButtonText}>Settings</Text>
        </TouchableOpacity>
      </View>

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
