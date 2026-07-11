import {logger} from '@/utils/logger';
import {database} from './database';

const TAG = 'PersistenceService';

class PersistenceServiceClass {
  async initialize(): Promise<void> {
    try {
      // In production, this creates the WatermelonDB database instance:
      //   const database = new Database({
      //     adapter: new SQLiteAdapter({ schema, dbName: 'viberadar', jsi: true }),
      //   });
      logger.info(TAG, 'Persistence layer initialized');
    } catch (error) {
      logger.error(TAG, 'Failed to initialize persistence', error as Error);
    }
  }

  // Groups
  async createGroup(name: string, passphrase: string, id: string): Promise<void> {
    logger.info(TAG, 'Group created', {name, id});
    // await database.get('groups').create(...)
  }

  async deleteGroup(id: string): Promise<void> {
    logger.info(TAG, 'Group deleted', {id});
  }

  // Members
  async addMember(groupId: string, userId: string, displayName: string): Promise<void> {
    logger.info(TAG, 'Member added', {groupId, userId, displayName});
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    logger.info(TAG, 'Member removed', {groupId, userId});
  }

  async updateMemberLastSeen(groupId: string, userId: string): Promise<void> {
    logger.info(TAG, 'Member lastSeen updated', {groupId, userId});
  }

  async getGroup(groupId: string) {
    // return database.get('groups').find(groupId);
    return null;
  }

  async getAllGroups() {
    // return database.get('groups').query().fetch();
    return [];
  }

  async getGroupMembers(groupId: string) {
    // return database.get('group_members').query(
    //   Q.where('group_id', groupId)
    // ).fetch();
    return [];
  }
}

export const PersistenceService = new PersistenceServiceClass();