import {Model} from '@nozbe/watermelondb';
import {field} from '@nozbe/watermelondb/decorators';

export class GroupModel extends Model {
  static table = 'groups';

  @field('name') name!: string;
  @field('passphrase') passphrase!: string;
  @field('created_at') createdAt!: number;
  @field('is_active') isActive!: boolean;
  @field('member_count') memberCount!: number;
}
