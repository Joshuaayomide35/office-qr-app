import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import ScannerScreen from '../screens/ScannerScreen';

export type HomeStackParamList = {
  HomeMain: undefined;
  Scanner: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Scanner" component={ScannerScreen} />
    </Stack.Navigator>
  );
}
