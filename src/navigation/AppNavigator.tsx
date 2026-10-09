import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import WaitingRoomScreen from '../screens/WaitingRoomScreen';
import HomeScreen from '../screens/HomeScreen';
import ScannerScreen from '../screens/ScannerScreen';
import AdminScreen from '../screens/AdminScreen';
import ApprovalsScreen from '../screens/ApprovalsScreen';
import CreateEmployeeScreen from '../screens/CreateEmployeeScreen';
import EmployeeCalendarScreen from '../screens/EmployeeCalendarScreen';
import PrintQRScreen from '../screens/PrintQRScreen';

export type RootStackParamList = {
  Login: undefined;
  WaitingRoom: undefined;
  Home: undefined;
  Scanner: undefined;
  Admin: undefined;
  Approvals: undefined;
  CreateEmployee: undefined;
  EmployeeCalendar: { employeeId: string; employeeName: string };
  PrintQR: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { session, status, role, loading } = useAuth();

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
          // Pending or Rejected User
          <Stack.Screen name="WaitingRoom" component={WaitingRoomScreen} />
        ) : (
          // Approved User
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Scanner" component={ScannerScreen} />
            {role === 'admin' && (
              <>
                <Stack.Screen name="Admin" component={AdminScreen} />
                <Stack.Screen name="Approvals" component={ApprovalsScreen} />
                <Stack.Screen name="CreateEmployee" component={CreateEmployeeScreen} />
                <Stack.Screen name="EmployeeCalendar" component={EmployeeCalendarScreen} />
                <Stack.Screen name="PrintQR" component={PrintQRScreen} />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
