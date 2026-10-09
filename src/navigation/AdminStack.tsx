import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminScreen from '../screens/AdminScreen';
import EmployeeCalendarScreen from '../screens/EmployeeCalendarScreen';
import CreateEmployeeScreen from '../screens/CreateEmployeeScreen';
import PrintQRScreen from '../screens/PrintQRScreen';

export type AdminStackParamList = {
  Employees: undefined;
  EmployeeCalendar: { employeeId: string; employeeName: string };
  CreateEmployee: undefined;
  PrintQR: undefined;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export default function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Employees" component={AdminScreen} />
      <Stack.Screen name="EmployeeCalendar" component={EmployeeCalendarScreen} />
      <Stack.Screen name="CreateEmployee" component={CreateEmployeeScreen} />
      <Stack.Screen name="PrintQR" component={PrintQRScreen} />
    </Stack.Navigator>
  );
}
