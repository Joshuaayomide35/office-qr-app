import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import WaitingRoomScreen from '../screens/WaitingRoomScreen';
import MainTabs from './MainTabs';

export type RootStackParamList = {
  Login: undefined;
  WaitingRoom: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { session, status, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          // Unauthenticated Stack — no self sign-up; admins create accounts.
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : status === 'pending' || status === 'rejected' ? (
          // Safety fallback: admin-created accounts are auto-approved, so this
          // should be unreachable in normal use.
          <Stack.Screen name="WaitingRoom" component={WaitingRoomScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
