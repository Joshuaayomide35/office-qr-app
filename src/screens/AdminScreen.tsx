import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import Avatar from '../components/Avatar';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../navigation/AdminStack';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList, 'Employees'>;

type EmployeeRow = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: 'employee' | 'admin';
  lastScanType: 'check_in' | 'check_out' | null;
};

const confirmAction = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: 'destructive', onPress: onConfirm },
    ]);
  }
};

export default function AdminScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user: currentUser } = useAuth();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    setErrorMessage('');

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, role')
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
        avatar_url: p.avatar_url,
        role: p.role as 'employee' | 'admin',
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

  const toggleAdmin = async (item: EmployeeRow) => {
    const makingAdmin = item.role !== 'admin';
    confirmAction(
      makingAdmin ? 'Make Admin?' : 'Remove Admin?',
      makingAdmin
        ? `${item.full_name} will be able to see all attendance, manage approvals, and create accounts.`
        : `${item.full_name} will lose admin access and go back to a regular employee.`,
      async () => {
        setBusyId(item.id);
        const { error } = await supabase
          .from('profiles')
          .update({ role: makingAdmin ? 'admin' : 'employee' })
          .eq('id', item.id);

        if (error) {
          setErrorMessage(error.message);
        } else {
          setEmployees((prev) =>
            prev.map((e) => (e.id === item.id ? { ...e, role: makingAdmin ? 'admin' : 'employee' } : e))
          );
        }
        setBusyId(null);
      }
    );
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
        <View>
          <Text style={styles.title}>Team</Text>
          <Text style={styles.subtitle}>Tap an employee to view their calendar</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('PrintQR')} activeOpacity={0.7} style={styles.backButton}>
            <Ionicons name="qr-code-outline" size={18} color="#6366f1" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('CreateEmployee')} activeOpacity={0.7} style={styles.backButton}>
            <Ionicons name="person-add-outline" size={18} color="#6366f1" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onRefresh} activeOpacity={0.7} style={styles.backButton}>
            <Ionicons name="refresh" size={18} color="#6366f1" />
          </TouchableOpacity>
        </View>
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
          const isSelf = item.id === currentUser?.id;
          const isAdmin = item.role === 'admin';
          return (
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.rowMain}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('EmployeeCalendar', { employeeId: item.id, employeeName: item.full_name })}
              >
                <Avatar uri={item.avatar_url} name={item.full_name} size={40} />
                <View style={styles.rowInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{item.full_name}</Text>
                    {isAdmin && (
                      <View style={styles.adminBadge}>
                        <Text style={styles.adminBadgeText}>ADMIN</Text>
                      </View>
                    )}
                  </View>
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

              {!isSelf && (
                <TouchableOpacity
                  style={[styles.roleButton, isAdmin ? styles.roleButtonRemove : styles.roleButtonAdd]}
                  onPress={() => toggleAdmin(item)}
                  disabled={busyId === item.id}
                  activeOpacity={0.8}
                >
                  {busyId === item.id ? (
                    <ActivityIndicator size="small" color={isAdmin ? '#ef4444' : '#6366f1'} />
                  ) : (
                    <>
                      <Ionicons
                        name={isAdmin ? 'shield-outline' : 'shield-checkmark-outline'}
                        size={14}
                        color={isAdmin ? '#ef4444' : '#6366f1'}
                      />
                      <Text style={[styles.roleButtonText, { color: isAdmin ? '#ef4444' : '#6366f1' }]}>
                        {isAdmin ? 'Remove Admin' : 'Make Admin'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 2,
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
    backgroundColor: '#121214',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 10,
    overflow: 'hidden',
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  rowInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  adminBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  adminBadgeText: {
    color: '#6366f1',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderTopWidth: 1,
    // @ts-ignore
    cursor: 'pointer',
  },
  roleButtonAdd: {
    borderTopColor: 'rgba(99, 102, 241, 0.25)',
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
  },
  roleButtonRemove: {
    borderTopColor: 'rgba(239, 68, 68, 0.25)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
