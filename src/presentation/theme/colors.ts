/**
 * VibeRadar — Cyberpunk Festival Color Palette
 * Dark background with neon accents for high visibility in sunlight
 */
export const colors = {
  // Backgrounds
  background: '#0D0D1A',
  surface: '#1A1A2E',
  surfaceLight: '#252540',
  card: '#16213E',

  // Primary neon accents
  primary: '#00F0FF', // Cyan — radar sweep, compass
  primaryDim: '#0099A8',
  secondary: '#FF00E4', // Magenta — friend dots, highlights
  secondaryDim: '#B3009E',
  accent: '#FFD700', // Gold — confidence indicators, warnings

  // Friend status colors
  friendNearby: '#00FF88', // Green — close friend
  friendMedium: '#FFD700', // Yellow — medium distance
  friendFar: '#FF4444', // Red — far / signal weak
  friendUnknown: '#666688', // Gray — no signal

  // Functional
  success: '#00FF88',
  warning: '#FFD700',
  error: '#FF4444',
  info: '#00F0FF',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0C0',
  textMuted: '#606080',
  textOnDark: '#E0E0FF',

  // UI elements
  border: '#2A2A45',
  divider: '#1E1E35',
  overlay: 'rgba(0, 0, 0, 0.6)',
  transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof colors;
