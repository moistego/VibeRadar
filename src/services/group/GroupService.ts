import {supabase} from '@/services/supabase/client';
import {logger} from '@/utils/logger';
import {GROUP} from '@/utils/constants';

const TAG = 'GroupService';

export interface Group {
      id: string;
      passcode: string;
      name: string | null;
      createdBy: string;
      createdAt: string;
      expiresAt: string;
}

export interface GroupMember {
      userId: string;
      displayName: string | null;
      joinedAt: string;
}

class GroupServiceClass {
      async createGroup(userId: string, name?: string, displayName?: string): Promise<Group | null> {
              const MAX_ATTEMPTS = 5;
              for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
                        const passcode = this.generatePasscode();
                        const {data, error} = await supabase
                          .from('groups')
                          .insert({
                                        passcode,
                                        name: name ?? null,
                                        created_by: userId,
                          })
                          .select()
                          .single();

                if (error) {
                            if (error.code === '23505') {
                                          logger.warn(TAG, `Passcode collision on attempt ${attempt + 1}, retrying`);
                                          continue;
                            }
                            logger.error(TAG, 'Failed to create group', error as unknown as Error);
                            return null;
                }

                const joined = await this.joinGroupById(data.id, userId, displayName);
                        if (!joined) {
                                    logger.error(TAG, 'Group created but creator failed to join as member');
                                    return null;
                        }

                logger.info(TAG, 'Group created', {groupId: data.id, passcode});
                        return this.mapGroup(data);
              }

        logger.error(TAG, 'Failed to create group after multiple passcode collisions');
              return null;
      }

  async joinGroupByPasscode(
          passcode: string,
          userId: string,
          displayName?: string,
        ): Promise<Group | null> {
          try {
                    const {data: group, error} = await supabase
                      .from('groups')
                      .select()
                      .eq('passcode', passcode)
                      .gt('expires_at', new Date().toISOString())
                      .single();

            if (error || !group) {
                        logger.warn(TAG, 'Group not found or expired for passcode', {passcode});
                        return null;
            }

            const memberCount = await this.getMemberCount(group.id);
                    if (memberCount >= GROUP.MAX_MEMBERS) {
                                logger.warn(TAG, 'Group is full', {groupId: group.id, memberCount});
                                return null;
                    }

            const joined = await this.joinGroupById(group.id, userId, displayName);
                    if (!joined) {
                                return null;
                    }

            logger.info(TAG, 'Joined group', {groupId: group.id});
                    return this.mapGroup(group);
          } catch (error) {
                    logger.error(TAG, 'Unexpected error joining group', error as Error);
                    return null;
          }
  }

  async leaveGroup(groupId: string, userId: string): Promise<void> {
          try {
                    const {error} = await supabase
                      .from('group_members')
                      .delete()
                      .eq('group_id', groupId)
                      .eq('user_id', userId);

            if (error) {
                        logger.error(TAG, 'Failed to leave group', error as unknown as Error);
            } else {
                        logger.info(TAG, 'Left group', {groupId});
            }
          } catch (error) {
                    logger.error(TAG, 'Unexpected error leaving group', error as Error);
          }
  }

  async getMembers(groupId: string): Promise<GroupMember[]> {
          const {data, error} = await supabase
            .from('group_members')
            .select('user_id, display_name, joined_at')
            .eq('group_id', groupId);

        if (error) {
                  logger.error(TAG, 'Failed to fetch group members', error as unknown as Error);
                  return [];
        }

        return (data ?? []).map(row => ({
                  userId: row.user_id,
                  displayName: row.display_name,
                  joinedAt: row.joined_at,
        }));
  }

  private async getMemberCount(groupId: string): Promise<number> {
          const {count, error} = await supabase
            .from('group_members')
            .select('*', {count: 'exact', head: true})
            .eq('group_id', groupId);

        if (error) {
                  logger.error(TAG, 'Failed to count group members', error as unknown as Error);
                  return 0;
        }

        return count ?? 0;
  }

  private async joinGroupById(
          groupId: string,
          userId: string,
          displayName?: string,
        ): Promise<boolean> {
          const {error} = await supabase.from('group_members').insert({
                    group_id: groupId,
                    user_id: userId,
                    display_name: displayName ?? null,
          });

        if (error) {
                  if (error.code === '23505') {
                              return true;
                  }
                  logger.error(TAG, 'Failed to insert group member', error as unknown as Error);
                  return false;
        }

        return true;
  }

  private generatePasscode(): string {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          let passcode = '';
          for (let i = 0; i < GROUP.PASSCODE_LENGTH; i++) {
                    passcode += chars[Math.floor(Math.random() * chars.length)];
          }
          return passcode;
  }

  private mapGroup(row: {
          id: string;
          passcode: string;
          name: string | null;
          created_by: string;
          created_at: string;
          expires_at: string;
  }): Group {
          return {
                    id: row.id,
                    passcode: row.passcode,
                    name: row.name,
                    createdBy: row.created_by,
                    createdAt: row.created_at,
                    expiresAt: row.expires_at,
          };
  }
}
export const GroupService = new GroupServiceClass();
export const GroupService = new GroupServiceClass();
