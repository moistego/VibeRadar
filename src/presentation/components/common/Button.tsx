import React from 'react';
import {TouchableOpacity, Text, StyleSheet, ActivityIndicator} from 'react-native';
import {colors, typography, spacing, borderRadius} from '@/presentation/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  size = 'md',
}) => {
  const bgColor =
    variant === 'primary'
      ? colors.primary
      : variant === 'secondary'
        ? colors.surfaceLight
        : colors.error;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {backgroundColor: bgColor},
        size === 'sm' && styles.small,
        size === 'lg' && styles.large,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}>
      {loading ? (
        <ActivityIndicator color={colors.textPrimary} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            variant === 'primary' && styles.primaryText,
            variant === 'danger' && styles.dangerText,
          ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  small: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    minHeight: 32,
  },
  large: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 52,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.background,
  },
  primaryText: {
    color: colors.background,
  },
  dangerText: {
    color: colors.textPrimary,
  },
});