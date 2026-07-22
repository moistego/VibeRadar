import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAppDispatch} from '@/state/store';
import {addGroup, setActiveGroup} from '@/state/slices/groupsSlice';
import {setUserId, joinGroup} from '@/state/slices/userSlice';
import {colors, typography, spacing, borderRadius} from '@/presentation/theme';
import {logger} from '@/utils/logger';

const TAG = 'PairingScreen';

type TabMode = 'create' | 'join';

/**
 * Generate a 6-character alphanumeric squad code (e.g. "VIBE42")
 */
function generateSquadCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I,O,0,1 to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const PairingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const [activeTab, setActiveTab] = useState<TabMode>('join');
  const [squadCode, setSquadCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  /**
   * Handle creating a new squad
   */
  const handleCreateSquad = useCallback(() => {
    const code = generateSquadCode();
    setGeneratedCode(code);
    setActiveTab('create');

    const groupId = `squad_${code}`;
    const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    dispatch(setUserId(userId));
    dispatch(
      addGroup({
        id: groupId,
        name: `Squad ${code}`,
        passphrase: code,
        createdAt: Date.now(),
        memberIds: [userId],
        isActive: true,
      }),
    );
    dispatch(setActiveGroup(groupId));
    dispatch(joinGroup(groupId));

    logger.info(TAG, 'Squad created', {code, groupId, userId});
  }, [dispatch]);

  /**
   * Handle joining an existing squad
   */
  const handleJoinSquad = useCallback(() => {
    if (squadCode.trim().length < 4) {
      Alert.alert('Invalid Code', 'Please enter a valid squad code (4-6 characters).');
      return;
    }

    if (!displayName.trim()) {
      Alert.alert('Name Required', 'Please enter your display name so your friends can find you.');
      return;
    }

    setIsJoining(true);
    const code = squadCode.trim().toUpperCase();
    const groupId = `squad_${code}`;
    const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    dispatch(setUserId(userId));
    dispatch(
      addGroup({
        id: groupId,
        name: `Squad ${code}`,
        passphrase: code,
        createdAt: Date.now(),
        memberIds: [userId],
        isActive: true,
      }),
    );
    dispatch(setActiveGroup(groupId));
    dispatch(joinGroup(groupId));

    logger.info(TAG, 'Joined squad', {code, groupId, userId});
    setIsJoining(false);

    // Navigate to Radar
    navigation.reset({
      index: 0,
      routes: [{name: 'Radar'}],
    });
  }, [squadCode, displayName, dispatch, navigation]);

  /**
   * Share the squad code via native share sheet
   */
  const handleShareCode = useCallback(async () => {
    if (!generatedCode) return;
    try {
      await Share.share({
        message: `Join my VibeRadar squad! Use code: ${generatedCode}`,
        title: 'VibeRadar Squad Invite',
      });
    } catch (error) {
      logger.error(TAG, 'Share failed', error as Error);
    }
  }, [generatedCode]);

  /**
   * Navigate to radar after creating a squad
   */
  const handleCreateDone = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{name: 'Radar'}],
    });
  }, [navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'join' && styles.activeTab]}
            onPress={() => setActiveTab('join')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'join' && styles.activeTabText,
              ]}>
              Join Squad
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'create' && styles.activeTab]}
            onPress={() => {
              setActiveTab('create');
              if (!generatedCode) handleCreateSquad();
            }}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'create' && styles.activeTabText,
              ]}>
              Create Squad
            </Text>
          </TouchableOpacity>
        </View>

        {/* Join Tab Content */}
        {activeTab === 'join' && (
          <View style={styles.tabContent}>
            {/* QR Scanner Placeholder */}
            <View style={styles.qrContainer}>
              <View style={styles.qrFrame}>
                <Text style={styles.qrPlaceholderText}>📷</Text>
                <Text style={styles.qrLabel}>Scan QR code</Text>
                {/* Animated scan bar — to be implemented with react-native-camera in Phase 2 */}
                <View style={styles.scanBar} />
              </View>
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or enter code</Text>
              <View style={styles.divider} />
            </View>

            {/* Manual Code Entry */}
            <View style={styles.codeInputContainer}>
              <TextInput
                style={styles.codeInput}
                value={squadCode}
                onChangeText={text => setSquadCode(text.toUpperCase())}
                placeholder="VIBE42"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                maxLength={6}
                textAlign="center"
              />
            </View>

            {/* Display Name */}
            <View style={styles.nameInputContainer}>
              <TextInput
                style={styles.nameInput}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your display name"
                placeholderTextColor={colors.textMuted}
                maxLength={20}
              />
            </View>

            {/* Join Button */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!squadCode.trim() || !displayName.trim()) && styles.buttonDisabled,
              ]}
              onPress={handleJoinSquad}
              disabled={!squadCode.trim() || !displayName.trim() || isJoining}>
              <Text style={styles.primaryButtonText}>
                {isJoining ? 'Joining...' : 'Join Squad'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Create Tab Content */}
        {activeTab === 'create' && generatedCode && (
          <View style={styles.tabContent}>
            {/* Generated Code Display */}
            <View style={styles.codeDisplayContainer}>
              <Text style={styles.codeLabel}>Your Squad Code</Text>
              <Text style={styles.codeDisplay}>{generatedCode}</Text>

              {/* QR Code Placeholder */}
              <View style={styles.qrPlaceholder}>
                <Text style={styles.qrPlaceholderIcon}>▦</Text>
                <Text style={styles.qrPlaceholderSmall}>
                  QR code ready — share with friends
                </Text>
              </View>
            </View>

            {/* Share Button */}
            <TouchableOpacity style={styles.shareButton} onPress={handleShareCode}>
              <Text style={styles.shareButtonText}>Share Code</Text>
            </TouchableOpacity>

            {/* Done Button */}
            <TouchableOpacity style={styles.primaryButton} onPress={handleCreateDone}>
              <Text style={styles.primaryButtonText}>Start Vibing 🎵</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  activeTab: {
    backgroundColor: colors.primary + '20',
  },
  tabText: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.primary,
  },
  // Tab content
  tabContent: {
    flex: 1,
  },
  // QR Scanner
  qrContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  qrFrame: {
    width: 240,
    height: 240,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    position: 'relative',
    overflow: 'hidden',
  },
  qrPlaceholderText: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  qrLabel: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  scanBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
    opacity: 0.6,
  },
  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.caption,
    color: colors.textMuted,
    marginHorizontal: spacing.md,
  },
  // Code Input
  codeInputContainer: {
    marginBottom: spacing.md,
  },
  codeInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    fontSize: 32,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Mono' : 'monospace',
    color: colors.primary,
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
  },
  // Name Input
  nameInputContainer: {
    marginBottom: spacing.lg,
  },
  nameInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Buttons
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '700',
    fontSize: 18,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  shareButton: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  shareButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  // Create tab code display
  codeDisplayContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  codeLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  codeDisplay: {
    fontSize: 48,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Mono' : 'monospace',
    color: colors.primary,
    letterSpacing: 12,
    marginBottom: spacing.lg,
  },
  qrPlaceholder: {
    width: 180,
    height: 180,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrPlaceholderIcon: {
    fontSize: 80,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  qrPlaceholderSmall: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
