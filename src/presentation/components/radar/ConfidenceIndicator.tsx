import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, typography} from '@/presentation/theme';

interface ConfidenceIndicatorProps {
  confidence: number;
  label: string;
}

export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  confidence,
  label,
}) => {
  const level =
    confidence >= 0.8
      ? {text: 'High', color: colors.friendNearby}
      : confidence >= 0.5
        ? {text: 'Med', color: colors.friendMedium}
        : {text: 'Low', color: colors.friendFar};

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.badge, {backgroundColor: level.color + '40'}]}>
        <Text style={[styles.badgeText, {color: level.color}]}>{level.text}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    ...typography.radarLabel,
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeText: {
    ...typography.radarLabel,
    fontWeight: '600',
  },
});