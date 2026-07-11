/**
 * WatermelonDB Schema for VibeRadar.
 * Local-first persistent storage for groups and friend data.
 *
 * In production, this schema is used with:
 *   import { schema } from '@nozbe/watermelondb';
 *   import { appSchema, tableSchema } from '@nozbe/watermelondb';
 *
 * Tables:
 *   - groups: Group metadata (id, name, passphrase, createdAt)
 *   - members: Friends within a group (id, group association, displayName, userId)
 */

import {appSchema, tableSchema} from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'groups',
      columns: [
        {name: 'name', type: 'string'},
        {name: 'passphrase', type: 'string'},
        {name: 'created_at', type: 'number'},
        {name: 'is_active', type: 'boolean'},
        {name: 'member_count', type: 'number'},
      ],
    }),
    tableSchema({
      name: 'group_members',
      columns: [
        {name: 'group_id', type: 'string', isIndexed: true},
        {name: 'user_id', type: 'string'},
        {name: 'display_name', type: 'string'},
        {name: 'last_seen_at', type: 'number'},
        {name: 'is_connected', type: 'boolean'},
      ],
    }),
  ],
});