import {createSelector} from '@reduxjs/toolkit';
import {RootState} from '@/state/store';

export const selectGroups = (state: RootState) => state.groups.groups;
export const selectActiveGroupId = (state: RootState) => state.groups.activeGroupId;

export const selectActiveGroup = createSelector(
  [selectGroups, selectActiveGroupId],
  (groups, activeId) => (activeId ? groups[activeId] ?? null : null),
);

export const selectGroupById = (groupId: string) =>
  createSelector([selectGroups], groups => groups[groupId] ?? null);

export const selectActiveGroupMembers = createSelector(
  [selectActiveGroup],
  group => group?.memberIds ?? [],
);

export const selectGroupCount = createSelector(
  [selectGroups],
  groups => Object.keys(groups).length,
);

export const selectHasActiveGroup = createSelector(
  [selectActiveGroup],
  group => group !== null && group.isActive,
);
