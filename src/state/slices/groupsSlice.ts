import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface Group {
  id: string;
  name: string;
  passphrase: string;
  createdAt: number;
  memberIds: string[];
  isActive: boolean;
}

interface GroupsState {
  groups: Record<string, Group>;
  activeGroupId: string | null;
}

const initialState: GroupsState = {
  groups: {},
  activeGroupId: null,
};

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    addGroup: (state, action: PayloadAction<Group>) => {
      state.groups[action.payload.id] = action.payload;
    },
    removeGroup: (state, action: PayloadAction<string>) => {
      delete state.groups[action.payload];
      if (state.activeGroupId === action.payload) {
        state.activeGroupId = null;
      }
    },
    setActiveGroup: (state, action: PayloadAction<string | null>) => {
      state.activeGroupId = action.payload;
    },
    addMemberToGroup: (
      state,
      action: PayloadAction<{groupId: string; memberId: string}>,
    ) => {
      const group = state.groups[action.payload.groupId];
      if (group && !group.memberIds.includes(action.payload.memberId)) {
        group.memberIds.push(action.payload.memberId);
      }
    },
    removeMemberFromGroup: (
      state,
      action: PayloadAction<{groupId: string; memberId: string}>,
    ) => {
      const group = state.groups[action.payload.groupId];
      if (group) {
        group.memberIds = group.memberIds.filter(
          id => id !== action.payload.memberId,
        );
      }
    },
    deactivateGroup: (state, action: PayloadAction<string>) => {
      const group = state.groups[action.payload];
      if (group) {
        group.isActive = false;
      }
    },
  },
});

export const {
  addGroup,
  removeGroup,
  setActiveGroup,
  addMemberToGroup,
  removeMemberFromGroup,
  deactivateGroup,
} = groupsSlice.actions;
export default groupsSlice.reducer;