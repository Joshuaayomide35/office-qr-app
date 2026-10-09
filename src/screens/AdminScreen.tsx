import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Admin'>;

type EmployeeRow = {
  id: string;
  full_name: string;
  email: string;
  lastScanType: 'check_in' | 'check_out' | null;
};

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];
const avatarColorFor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export default function AdminScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchEmployees = useCallback(async () => {
    setErrorMessage('');

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('status', 'approved')
      .order('full_name', { ascending: true });

    if (profilesError) {
      setErrorMessage(profilesError.message);
      return;
    }

    const { data: logs } = await supabase
      .from('attendance_logs')
      .select('user_id, scan_type, timestamp')
      .order('timestamp', { ascending: false });

    const lastByUser = new Map<string, 'check_in' | 'check_out'>();
    for (const log of logs || []) {
      if (!lastByUser.has(log.user_id)) lastByUser.set(log.user_id, log.scan_type);
    }

    setEmployees(
      (profiles || []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        lastScanType: lastByUser.get(p.id) || null,
      }))
    );
  }, []);

  useEffect(() => {
    fetchEmployees().finally(() => setLoading(false));
  }, [fetchEmployees]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEmployees();
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} activeOpacity={0.7} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="#6366f1" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Attendance</Text>
          <Text style={styles.subtitle}>Tap an employee to view their calendar</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} activeOpacity={0.7} style={styles.backButton}>
          <Ionicons name="refresh" size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <FlatList
        data={employees}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="people-outline" size={32} color="#3f3f46" />
            <Text style={styles.emptyText}>No approved employees yet.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isCheckedIn = item.lastScanType === 'check_in';
          return (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('EmployeeCalendar', { employeeId: item.id, employeeName: item.full_name })}
            >
              <View style={[styles.avatar, { backgroundColor: avatarColorFor(item.full_name) }]}>
                <Text style={styles.avatarText}>{getInitials(item.full_name)}</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.name}>{item.full_name}</Text>
                <Text style={styles.email}>{item.email}</Text>
              </View>
              {item.lastScanType && (
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isCheckedIn ? '#10b981' : '#71717a' },
                  ]}
                />
              )}
              <Ionicons name="chevron-forward" size={18} color="#3f3f46" />
            </TouchableOpacity>
          );
        }}
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
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
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
    margin: 16,
    marginBottom: 0,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    flexShrink: 1,
  },
  listContent: {
    padding: 16,
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
    padding: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  rowInfo: {
    flex: 1,
  },
  name: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  email: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
