export type RootStackParamList = {
  Onboarding: undefined;
  Pairing: undefined;
  Radar: undefined;
  FriendsList: undefined;
  Settings: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
