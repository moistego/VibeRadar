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
import {AuthService} from '@/services/auth/AuthService';
import {GroupService, Group as BackendGroup} from '@/services/group/GroupService';

const TAG = 'PairingScreen';

type TabMode = 'create' | 'join';

export const PairingScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const dispatch = useAppDispatch();
    const [activeTab, setActiveTab] = useState<TabMode>('join');
    const [squadCode, setSquadCode] = useState('');
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const saveGroupToRedux = useCallback(
          (group: BackendGroup, userId: string) => {
                  dispatch(setUserId(userId));
                  dispatch(
                            addGroup({
                                        id: group.id,
                                        name: group.name ?? `Squad ${group.passcode}`,
                                        passphrase: group.passcode,
                                        createdAt: new Date(group.createdAt).getTime(),
                                        memberIds: [userId],
                                        isActive: true,
                            }),
                          );
                  dispatch(setActiveGroup(group.id));
                  dispatch(joinGroup(group.id));
          },
          [dispatch],
        );

    const handleCreateSquad = useCallback(async () => {
          const userId = AuthService.getUserId();
          if (!userId) {
                  Alert.alert('Not Ready', 'Still setting up your session — please try again in a moment.');
                  return;
          }

                                              setIsCreating(true);
          const group = await GroupService.createGroup(userId, undefined, displayName.trim() || undefined);
          setIsCreating(false);

                                              if (!group) {
                                                      Alert.alert('Something Went Wrong', 'Could not create a squad. Check your connection and try again.');
                                                      return;
                                              }

                                              setGeneratedCode(group.passcode);
          setActiveTab('create');
          saveGroupToRedux(group, userId);
          logger.info(TAG, 'Squad created', {code: group.passcode, groupId: group.id, userId});
    }, [displayName, saveGroupToRedux]);

    const handleJoinSquad = useCallback(async () => {
          if (squadCode.trim().length < 4) {
                  Alert.alert('Invalid Code', 'Please enter a valid squad code (4-6 characters).');
                  return;
          }

                                            if (!displayName.trim()) {
                                                    Alert.alert('Name Required', 'Please enter your display name so your friends can find you.');
                                                    return;
                                            }

                                            const userId = AuthService.getUserId();
          if (!userId) {
                  Alert.alert('Not Ready', 'Still setting up your session — please try again in a moment.');
                  return;
          }

                                            setIsJoining(true);
          const code = squadCode.trim().toUpperCase();
          const group = await GroupService.joinGroupByPasscode(code, userId, displayName.trim());
          setIsJoining(false);

                                            if (!group) {
                                                    Alert.alert('Squad Not Found', 'Check the code and try again — it may be full, expired, or incorrect.');
                                                    return;
                                            }

                                            saveGroupToRedux(group, userId);
          logger.info(TAG, 'Joined squad', {code, groupId: group.id, userId});

                                            navigation.reset({
                                                    index: 0,
                                                    routes: [{name: 'Radar'}],
                                            });
    }, [squadCode, displayName, navigation, saveGroupToRedux]);

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
                                                      </Text>Text>
                                        </TouchableOpacity>TouchableOpacity>
                                        <TouchableOpacity
                                                      style={[styles.tab, activeTab === 'create' && styles.activeTab]}
                                                      onPress={() => {
                                                                      setActiveTab('create');
                                                                      if (!generatedCode && !isCreating) handleCreateSquad();
                                                      }}>
                                                      <Text
                                                                      style={[
                                                                                        styles.tabText,
                                                                                        activeTab === 'create' && styles.activeTabText,
                                                                                      ]}>
                                                                      Create Squad
                                                      </Text>Text>
                                        </TouchableOpacity>TouchableOpacity>
                            </View>View>

                    {activeTab === 'join' && (
                              <View style={styles.tabContent}>
                                            <View style={styles.qrContainer}>
                                                            <View style={styles.qrFrame}>
                                                                              <Text style={styles.qrPlaceholderText}>📷</Text>Text>
                                                                              <Text style={styles.qrLabel}>Scan QR code</Text>Text>
                                                                              <View style={styles.scanBar} />
                                                            </View>View>
                                            </View>View>

                                            <View style={styles.dividerRow}>
                                                            <View style={styles.divider} />
                                                            <Text style={styles.dividerText}>or enter code</Text>Text>
                                                            <View style={styles.divider} />
                                            </View>View>

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
                                            </View>View>

                                            <View style={styles.nameInputContainer}>
                                                            <TextInput
                                                                              style={styles.nameInput}
                                                                              value={displayName}
                                                                              onChangeText={setDisplayName}
                                                                              placeholder="Your display name"
                                                                              placeholderTextColor={colors.textMuted}
                                                                              maxLength={20}
                                                                            />
                                            </View>View>

                                            <TouchableOpacity
                                                            style={[
                                                                              styles.primaryButton,
                                                                              (!squadCode.trim() || !displayName.trim()) && styles.buttonDisabled,
                                                                            ]}
                                                            onPress={handleJoinSquad}
                                                            disabled={!squadCode.trim() || !displayName.trim() || isJoining}>
                                                            <Text style={styles.primaryButtonText}>
                                                              {isJoining ? 'Joining...' : 'Join Squad'}
                                                            </Text>Text>
                                            </TouchableOpacity>TouchableOpacity>
                              </View>View>
                            )}

                    {activeTab === 'create' && (
                              <View style={styles.tabContent}>
                                {isCreating && !generatedCode && (
                                              <View style={styles.codeDisplayContainer}>
                                                                <Text style={styles.codeLabel}>Creating your squad…</Text>Text>
                                              </View>View>
                                            )}

                                {generatedCode && (
                                              <>
                                                              <View style={styles.codeDisplayContainer}>
                                                                                <Text style={styles.codeLabel}>Your Squad Code</Text>Text>
                                                                                <Text style={styles.codeDisplay}>{generatedCode}</Text>Text>
                                                                                <View style={styles.qrPlaceholder}>
                                                                                                    <Text style={styles.qrPlaceholderIcon}>⬦</Text>Text>
                                                                                                    <Text style={styles.qrPlaceholderSmall}>
                                                                                                                          QR code ready — share with friends
                                                                                                      </Text>Text>
                                                                                </View>View>
                                                              </View>View>
                                              
                                                              <TouchableOpacity style={styles.shareButton} onPress={handleShareCode}>
                                                                                <Text style={styles.shareButtonText}>Share Code</Text>Text>
                                                              </TouchableOpacity>TouchableOpacity>
                                              
                                                              <TouchableOpacity style={styles.primaryButton} onPress={handleCreateDone}>
                                                                                <Text style={styles.primaryButtonText}>Start Vibing 🎵</Text>Text>
                                                              </TouchableOpacity>TouchableOpacity>
                                              </>>
                                            )}
                              </View>View>
                          )}
                  </View>View>
          </KeyboardAvoidingView>KeyboardAvoidingView>
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
    tabContent: {
          flex: 1,
    },
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
</>
