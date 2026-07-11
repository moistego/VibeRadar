import {Model} from '@nozbe/watermelondb';
import {field, date, readonly, relation} from '@nozbe/watermelondb/decorators';

export class GroupMemberModel extends Model {
  static table = 'group_members';

  @field('group_id') groupId!: string;
  @field('user_id') userId!: string;
  @field('display_name') displayName!: string;
  @field('last_seen_at') lastSeenAt!: number;
  @field('is_connected') isConnected!: boolean;
}