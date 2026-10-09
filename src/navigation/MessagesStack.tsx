import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ConversationsScreen from '../screens/ConversationsScreen';
import ChatScreen from '../screens/ChatScreen';

export type MessagesStackParamList = {
  Conversations: undefined;
  Chat: { otherUserId: string; otherUserName: string };
};

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export default function MessagesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Conversations" component={ConversationsScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}
