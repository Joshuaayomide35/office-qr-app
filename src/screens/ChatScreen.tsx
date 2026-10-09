import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MessagesStackParamList } from '../navigation/MessagesStack';

type NavigationProp = NativeStackNavigationProp<MessagesStackParamList, 'Chat'>;
type ScreenRouteProp = RouteProp<MessagesStackParamList, 'Chat'>;

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

export default function ChatScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const { otherUserId, otherUserName } = route.params;
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const listRef = useRef<FlatList>(null);

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, content, created_at, read_at')
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      setErrorMessage(error.message);
    } else {
      setMessages((data as Message[]) || []);
      const unreadIds = (data || []).filter((m) => m.recipient_id === user.id && !m.read_at).map((m) => m.id);
      if (unreadIds.length > 0) {
        await supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
      }
    }
    setLoading(false);
  }, [user, otherUserId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`chat-${user.id}-${otherUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` },
        (payload) => {
          const incoming = payload.new as Message;
          if (incoming.sender_id === otherUserId) {
            setMessages((prev) => [...prev, incoming]);
            supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', incoming.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, otherUserId]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || !user || sending) return;

    setSending(true);
    setInput('');
    setErrorMessage('');

    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      sender_id: user.id,
      recipient_id: otherUserId,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages((prev) => [...prev, optimistic]);

    const { data, error } = await supabase
      .from('messages')
      .insert([{ sender_id: user.id, recipient_id: otherUserId, content }])
      .select()
      .single();

    if (error) {
      setErrorMessage(error.message);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } else if (data) {
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? (data as Message) : m)));
    }
    setSending(false);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="#6366f1" />
        </TouchableOpacity>
        <Text style={styles.title}>{otherUserName}</Text>
        <View style={{ width: 38 }} />
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="chatbubble-ellipses-outline" size={28} color="#3f3f46" />
            <Text style={styles.emptyText}>Say hello to {otherUserName}.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMine = item.sender_id === user?.id;
          return (
            <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
              <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.content}</Text>
              </View>
              <Text style={styles.bubbleTime}>
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
              </Text>
            </View>
          );
        }}
      />

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message..."
          placeholderTextColor="#52525b"
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
          activeOpacity={0.8}
        >
          {sending ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="arrow-up" size={18} color="#ffffff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f23',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    color: '#71717a',
    marginTop: 10,
    fontSize: 14,
  },
  bubbleRow: {
    marginBottom: 12,
    maxWidth: '78%',
  },
  bubbleRowMine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubbleRowTheirs: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    color: '#e4e4e7',
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextMine: {
    color: '#ffffff',
  },
  bubbleTime: {
    color: '#52525b',
    fontSize: 10,
    marginTop: 4,
    marginHorizontal: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 6,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#1f1f23',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
