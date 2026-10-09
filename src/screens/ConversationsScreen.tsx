import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import Avatar from '../components/Avatar';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MessagesStackParamList } from '../navigation/MessagesStack';

type NavigationProp = NativeStackNavigationProp<MessagesStackParamList, 'Conversations'>;

type Person = {
  id: string;
  full_name: string;
  avatar_url: string | null;
};

type ConversationRow = Person & {
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

export default function ConversationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setErrorMessage('');

    const { data: people, error: peopleError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('status', 'approved')
      .neq('id', user.id)
      .order('full_name', { ascending: true });

    if (peopleError) {
      setErrorMessage(peopleError.message);
      setLoading(false);
      return;
    }

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('sender_id, recipient_id, content, created_at, read_at')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (messagesError) {
      setErrorMessage(messagesError.message);
      setLoading(false);
      return;
    }

    const lastByPartner = new Map<string, { content: string; created_at: string }>();
    const unreadByPartner = new Map<string, number>();

    for (const m of messages || []) {
      const partnerId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      if (!lastByPartner.has(partnerId)) {
        lastByPartner.set(partnerId, { content: m.content, created_at: m.created_at });
      }
      if (m.recipient_id === user.id && !m.read_at) {
        unreadByPartner.set(partnerId, (unreadByPartner.get(partnerId) || 0) + 1);
      }
    }

    const combined: ConversationRow[] = (people || []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      lastMessage: lastByPartner.get(p.id)?.content || null,
      lastMessageAt: lastByPartner.get(p.id)?.created_at || null,
      unreadCount: unreadByPartner.get(p.id) || 0,
    }));

    combined.sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) return b.lastMessageAt.localeCompare(a.lastMessageAt);
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      return a.full_name.localeCompare(b.full_name);
    });

    setRows(combined);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Messages</Text>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="chatbubble-ellipses-outline" size={32} color="#3f3f46" />
            <Text style={styles.emptyText}>No one else to message yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Chat', { otherUserId: item.id, otherUserName: item.full_name })}
          >
            <Avatar uri={item.avatar_url} name={item.full_name} size={46} />
            <View style={styles.rowInfo}>
              <Text style={styles.name}>{item.full_name}</Text>
              <Text style={[styles.preview, item.unreadCount > 0 && styles.previewUnread]} numberOfLines={1}>
                {item.lastMessage || 'Say hello'}
              </Text>
            </View>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#09090b',
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingBottom: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    flexShrink: 1,
  },
  listContent: {
    padding: 20,
    paddingTop: 4,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    color: '#71717a',
    marginTop: 10,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#121214',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 12,
    marginBottom: 10,
    // @ts-ignore
    cursor: 'pointer',
  },
  rowInfo: {
    flex: 1,
  },
  name: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  preview: {
    color: '#71717a',
    fontSize: 13,
    marginTop: 2,
  },
  previewUnread: {
    color: '#d4d4d8',
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});
