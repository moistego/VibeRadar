export type RootStackParamList = {
  Radar: undefined;
  FriendsList: undefined;
  Settings: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}