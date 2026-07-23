import React from 'react';
import {View, StyleSheet} from 'react-native';
import Svg, {Circle, G, Line, Text as SvgText} from 'react-native-svg';
import {colors} from '@/presentation/theme';
import {FriendDot} from './FriendDot';
import {ConfidenceIndicator} from './ConfidenceIndicator';

interface FriendData {
  userId: string;
  bearing: number | null;
  distance: number | null;
  confidence: number;
  displayName?: string;
}

interface RadarCompassProps {
  size: number;
  friends: FriendData[];
  heading: number;
  userLatitude?: number | null;
  userLongitude?: number | null;
}

export const RadarCompass: React.FC<RadarCompassProps> = ({
  size,
  friends,
  heading,
}) => {
  const center = size / 2;
  const radius = size / 2 - 24;
  const scale = size / 320; // Scale based on 320px design reference

  // Render compass rings
  const rings = [0.33, 0.66, 1.0].map((ratio, i) => (
    <Circle
      key={`ring-${i}`}
      cx={center}
      cy={center}
      r={radius * ratio}
      stroke={colors.border}
      strokeWidth={0.5 * scale}
      fill="none"
      opacity={0.6}
    />
  ));

  // Render cardinal direction labels
  const cardinalLabels = [
    {label: 'N', angle: 0},
    {label: 'E', angle: 90},
    {label: 'S', angle: 180},
    {label: 'W', angle: 270},
  ];

  const cardinalElements = cardinalLabels.map(({label, angle}) => {
    const rad = ((angle - heading) * Math.PI) / 180;
    const labelRadius = radius + 16 * scale;
    const x = center + labelRadius * Math.sin(rad);
    const y = center - labelRadius * Math.cos(rad);
    return (
      <SvgText
        key={`cardinal-${label}`}
        x={x}
        y={y}
        fill={colors.textMuted}
        fontSize={10 * scale}
        fontWeight="600"
        textAnchor="middle"
        alignmentBaseline="central">
        {label}
      </SvgText>
    );
  });

  // Render friend dots
  const friendElements = friends
    .filter(f => f.bearing !== null && f.distance !== null)
    .map((friend, index) => {
      // Map distance (0-100m) to radial position (0 to radius)
      const maxDisplayDistance = 100;
      const clampedDistance = Math.min(friend.distance ?? 0, maxDisplayDistance);
      const radialPosition = (clampedDistance / maxDisplayDistance) * radius * 0.85;

      // Convert bearing (relative to user heading) to SVG coordinates
      // bearing 0 = straight ahead = top of compass
      const bearingRad = (friend.bearing! * Math.PI) / 180;
      const x = center + radialPosition * Math.sin(bearingRad);
      const y = center - radialPosition * Math.cos(bearingRad);

      return (
        <G key={friend.userId}>
          {/* Direction line from center to friend */}
          <Line
            x1={center}
            y1={center}
            x2={x}
            y2={y}
            stroke={colors.secondary}
            strokeWidth={1 * scale}
            opacity={0.3}
          />
          {/* Friend dot */}
          <FriendDot
            cx={x}
            cy={y}
            confidence={friend.confidence}
            isNearest={index === 0}
            scale={scale}
          />
          {/* Distance label */}
          <SvgText
            x={x}
            y={y + 14 * scale}
            fill={colors.textMuted}
            fontSize={8 * scale}
            textAnchor="middle">
            {friend.distance !== null ? `${friend.distance.toFixed(0)}m` : '?'}
          </SvgText>
        </G>
      );
    });

  return (
    <View style={[styles.container, {width: size, height: size}]}>
      <Svg width={size} height={size}>
        {rings}
        {cardinalElements}

        {/* Radar sweep line (animated in production) */}
        {/* Not animating in static scaffold — will be added in Phase 2 */}

        {/* User position indicator */}
        <Circle
          cx={center}
          cy={center}
          r={8 * scale}
          fill={colors.primary}
          stroke={colors.primaryDim}
          strokeWidth={2 * scale}
        />

        {friendElements}
      </Svg>

      {/* Confidence indicator positioned below the radar */}
      {friends.length > 0 && (
        <View style={styles.confidenceContainer}>
          {friends.map(friend => (
            <ConfidenceIndicator
              key={friend.userId}
              confidence={friend.confidence}
              label={friend.displayName ?? friend.userId.slice(0, 6)}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  confidenceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
});
