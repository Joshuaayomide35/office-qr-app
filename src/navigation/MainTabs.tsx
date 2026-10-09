import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

import HomeStack from './HomeStack';
import MessagesStack from './MessagesStack';
import AdminStack from './AdminStack';
import SettingsScreen from '../screens/SettingsScreen';

export type MainTabsParamList = {
  HomeTab: undefined;
  MessagesTab: undefined;
  TeamTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

function UnreadDot() {
  return (
    <View
      style={{
        position: 'absolute',
        top: -2,
        right: -6,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ef4444',
      }}
    />
  );
}

export default function MainTabs() {
  const { user, role } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .is('read_at', null);
      setHasUnread((count || 0) > 0);
    };

    checkUnread();

    const channel = supabase
      .channel(`unread-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` },
        () => setHasUnread(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#52525b',
        tabBarStyle: {
          backgroundColor: '#0d0d0f',
          borderTopColor: '#1f1f23',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={MessagesStack}
        listeners={{ focus: () => setHasUnread(false) }}
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="chatbubble-ellipses" size={size} color={color} />
              {hasUnread && <UnreadDot />}
            </View>
          ),
        }}
      />
      {role === 'admin' && (
        <Tab.Screen
          name="TeamTab"
          component={AdminStack}
          options={{
            title: 'Team',
            tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
          }}
        />
      )}
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-sharp" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
