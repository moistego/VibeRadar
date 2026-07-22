import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAppSelector} from '@/state/store';
import {OnboardingScreen} from '@/presentation/screens/OnboardingScreen';
import {PairingScreen} from '@/presentation/screens/PairingScreen';
import {RadarScreen} from '@/presentation/screens/RadarScreen';
import {FriendsListScreen} from '@/presentation/screens/FriendsListScreen';
import {SettingsScreen} from '@/presentation/screens/SettingsScreen';
import type {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const isOnboarded = useAppSelector(state => state.user.isOnboarded);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isOnboarded ? 'Pairing' : 'Onboarding'}
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0D0D1A',
          },
          headerTintColor: '#00F0FF',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          contentStyle: {
            backgroundColor: '#0D0D1A',
          },
          animation: 'slide_from_right',
        }}>
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Pairing"
          component={PairingScreen}
          options={{
            title: 'Squad',
            headerBackVisible: false,
          }}
        />
        <Stack.Screen
          name="Radar"
          component={RadarScreen}
          options={{
            title: 'VibeRadar',
            headerLeft: () => null,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="FriendsList"
          component={FriendsListScreen}
          options={{title: 'Friends'}}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{title: 'Settings'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
