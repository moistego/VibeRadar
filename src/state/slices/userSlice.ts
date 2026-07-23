import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface UserState {
  id: string | null;
  displayName: string | null;
  groupIds: string[];
  deviceToken: string | null;
  isOnboarded: boolean;
}

const initialState: UserState = {
  id: null,
  displayName: null,
  groupIds: [],
  deviceToken: null,
  isOnboarded: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserId: (state, action: PayloadAction<string>) => {
      state.id = action.payload;
    },
    setDisplayName: (state, action: PayloadAction<string>) => {
      state.displayName = action.payload;
    },
    joinGroup: (state, action: PayloadAction<string>) => {
      if (!state.groupIds.includes(action.payload)) {
        state.groupIds.push(action.payload);
      }
    },
    leaveGroup: (state, action: PayloadAction<string>) => {
      state.groupIds = state.groupIds.filter(id => id !== action.payload);
    },
    setDeviceToken: (state, action: PayloadAction<string>) => {
      state.deviceToken = action.payload;
    },
    setOnboarded: state => {
      state.isOnboarded = true;
    },
    resetUser: () => initialState,
  },
});

export const {
  setUserId,
  setDisplayName,
  joinGroup,
  leaveGroup,
  setDeviceToken,
  setOnboarded,
  resetUser,
} = userSlice.actions;
export default userSlice.reducer;
