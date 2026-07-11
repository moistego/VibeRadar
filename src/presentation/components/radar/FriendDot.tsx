import React from 'react';
import {Circle as SvgCircle} from 'react-native-svg';
import {colors} from '@/presentation/theme';

interface FriendDotProps {
  cx: number;
  cy: number;
  confidence: number;
  isNearest: boolean;
  scale: number;
}

export const FriendDot: React.FC<FriendDotProps> = ({
  cx,
  cy,
  confidence,
  isNearest,
  scale,
}) => {
  // Color based on confidence
  const dotColor =
    confidence >= 0.8
      ? colors.friendNearby
      : confidence >= 0.5
        ? colors.friendMedium
        : colors.friendFar;

  const dotRadius = isNearest ? 6 * scale : 5 * scale;
  const pulseRadius = isNearest ? dotRadius + 4 * scale : 0;

  return (
    <>
      {/* Pulse ring for nearest friend */}
      {isNearest && (
        <SvgCircle
          cx={cx}
          cy={cy}
          r={pulseRadius}
          stroke={dotColor}
          strokeWidth={1 * scale}
          fill="none"
          opacity={0.4}
        />
      )}
      {/* Main dot */}
      <SvgCircle
        cx={cx}
        cy={cy}
        r={dotRadius}
        fill={dotColor}
        opacity={0.3 + 0.7 * confidence}
      />
    </>
  );
};