import React from 'react';
import {View, Text, FlatList, StyleSheet} from 'react-native';
import {useAppSelector} from '@/state/store';
import {selectActivePeers} from '@/state/selectors/peerSelectors';
import {selectActiveGroup} from '@/state/selectors/groupSelectors';
import {colors, typography, spacing} from '@/presentation/theme';

export const FriendsListScreen: React.FC = () => {
  const activePeers = useAppSelector(selectActivePeers);
  const activeGroup = useAppSelector(selectActiveGroup);

  const renderFriendItem = ({item: peer}: {item: any}) => {
    const distanceText =
      peer.distance !== null ? `${peer.distance.toFixed(0)}m` : '…';
    const bearingText =
      peer.bearing !== null ? `${peer.bearing.toFixed(0)}°` : '—';
    const confidenceText =
      peer.confidence >= 0.8
        ? 'High'
        : peer.confidence >= 0.5
          ? 'Medium'
          : 'Low';

    return (
      <View style={styles.friendCard}>
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>
            {peer.displayName ?? `Friend ${peer.userId.slice(0, 4)}`}
          </Text>
          <Text style={styles.friendDetail}>
            Distance: {distanceText} · Bearing: {bearingText}
          </Text>
        </View>
        <View style={styles.friendMeta}>
          <Text style={styles.confidenceText}>{confidenceText}</Text>
          <View
            style={[
              styles.signalDot,
              {
                backgroundColor:
                  peer.lastRSSI >= -70
                    ? colors.success
                    : peer.lastRSSI >= -85
                      ? colors.warning
                      : colors.error,
              },
            ]}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {activeGroup && (
        <View style={styles.groupHeader}>
          <Text style={styles.groupName}>{activeGroup.name}</Text>
          <Text style={styles.groupDetail}>
            {activeGroup.memberIds.length} members ·{' '}
            {activePeers.length} nearby
          </Text>
        </View>
      )}

      {activePeers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No friends nearby</Text>
          <Text style={styles.emptySubtitle}>
            Friends in your group will appear here when they're in BLE range
          </Text>
        </View>
      ) : (
        <FlatList
          data={activePeers}
          keyExtractor={item => item.userId}
          renderItem={renderFriendItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  groupHeader: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  groupName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  groupDetail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  listContent: {
    padding: spacing.md,
  },
  friendCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  friendDetail: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  friendMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  confidenceText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  signalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textSecondary,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
