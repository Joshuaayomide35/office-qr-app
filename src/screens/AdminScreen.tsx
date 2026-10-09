import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Admin'>;

type AttendanceRow = {
  id: string;
  scan_type: 'check_in' | 'check_out';
  timestamp: string;
  latitude: number;
  longitude: number;
  profiles: { full_name: string; email: string } | null;
};

const COLUMN_WIDTHS = {
  name: 190,
  email: 220,
  type: 120,
  date: 120,
  time: 110,
};

const TABLE_WIDTH = Object.values(COLUMN_WIDTHS).reduce((a, b) => a + b, 0);

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

const formatDate = (date: Date) => {
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function AdminScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchLogs = useCallback(async () => {
    setErrorMessage('');
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('id, scan_type, timestamp, latitude, longitude, profiles(full_name, email)')
      .order('timestamp', { ascending: false })
      .limit(200);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setRows((data as unknown as AttendanceRow[]) || []);
    }
  }, []);

  useEffect(() => {
    fetchLogs().finally(() => setLoading(false));
  }, [fetchLogs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  const stats = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayRows = rows.filter((r) => new Date(r.timestamp).toDateString() === todayStr);
    const checkIns = todayRows.filter((r) => r.scan_type === 'check_in').length;
    const checkOuts = todayRows.filter((r) => r.scan_type === 'check_out').length;

    const latestByUser = new Map<string, AttendanceRow>();
    for (const r of rows) {
      const key = r.profiles?.email || r.id;
      if (!latestByUser.has(key)) latestByUser.set(key, r);
    }
    const currentlyIn = Array.from(latestByUser.values()).filter((r) => r.scan_type === 'check_in').length;

    return { checkIns, checkOuts, currentlyIn, total: rows.length };
  }, [rows]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const TableHeader = () => (
    <View style={[styles.headerRow, { width: TABLE_WIDTH }]}>
      <Text style={[styles.headerCell, { width: COLUMN_WIDTHS.name }]}>Employee</Text>
      <Text style={[styles.headerCell, { width: COLUMN_WIDTHS.email }]}>Email</Text>
      <Text style={[styles.headerCell, { width: COLUMN_WIDTHS.type }]}>Status</Text>
      <Text style={[styles.headerCell, { width: COLUMN_WIDTHS.date }]}>Date</Text>
      <Text style={[styles.headerCell, { width: COLUMN_WIDTHS.time }]}>Time</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} activeOpacity={0.7} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="#6366f1" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Attendance Log</Text>
          <Text style={styles.subtitle}>Live check-in activity across your team</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} activeOpacity={0.7} style={styles.backButton}>
          <Ionicons name="refresh" size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Ionicons name="log-in-outline" size={18} color="#10b981" />
            </View>
            <Text style={styles.statValue}>{stats.currentlyIn}</Text>
            <Text style={styles.statLabel}>Currently In</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
              <Ionicons name="arrow-down-circle-outline" size={18} color="#6366f1" />
            </View>
            <Text style={styles.statValue}>{stats.checkIns}</Text>
            <Text style={styles.statLabel}>Check-ins Today</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <Ionicons name="arrow-up-circle-outline" size={18} color="#ef4444" />
            </View>
            <Text style={styles.statValue}>{stats.checkOuts}</Text>
            <Text style={styles.statLabel}>Check-outs Today</Text>
          </View>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.tableCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={rows.length > 0}>
            <View>
              <TableHeader />
              {rows.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="document-text-outline" size={32} color="#3f3f46" />
                  <Text style={styles.emptyText}>No attendance records yet.</Text>
                </View>
              ) : (
                rows.map((item, index) => {
                  const date = new Date(item.timestamp);
                  const isCheckIn = item.scan_type === 'check_in';
                  const name = item.profiles?.full_name || 'Unknown';
                  return (
                    <View key={item.id} style={[styles.dataRow, index % 2 === 1 && styles.dataRowAlt]}>
                      <View style={[styles.nameCell, { width: COLUMN_WIDTHS.name }]}>
                        <View style={[styles.avatar, { backgroundColor: avatarColorFor(name) }]}>
                          <Text style={styles.avatarText}>{getInitials(name)}</Text>
                        </View>
                        <Text style={styles.cellStrong} numberOfLines={1}>{name}</Text>
                      </View>
                      <Text style={[styles.cell, { width: COLUMN_WIDTHS.email }]} numberOfLines={1}>
                        {item.profiles?.email || '-'}
                      </Text>
                      <View style={{ width: COLUMN_WIDTHS.type }}>
                        <View style={[styles.badge, { backgroundColor: isCheckIn ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)' }]}>
                          <Ionicons
                            name={isCheckIn ? 'arrow-down-circle' : 'arrow-up-circle'}
                            size={13}
                            color={isCheckIn ? '#10b981' : '#ef4444'}
                          />
                          <Text style={[styles.badgeText, { color: isCheckIn ? '#10b981' : '#ef4444' }]}>
                            {isCheckIn ? 'Check In' : 'Check Out'}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.cell, { width: COLUMN_WIDTHS.date }]}>{formatDate(date)}</Text>
                      <Text style={[styles.cell, { width: COLUMN_WIDTHS.time }]}>
                        {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#121214',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 14,
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: '#71717a',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
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
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    flexShrink: 1,
  },
  tableCard: {
    backgroundColor: '#121214',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    overflow: 'hidden',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    width: TABLE_WIDTH,
  },
  emptyText: {
    color: '#71717a',
    marginTop: 10,
    fontSize: 14,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#18181b',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  headerCell: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingRight: 8,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f23',
  },
  dataRowAlt: {
    backgroundColor: '#0d0d0f',
  },
  nameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  cell: {
    color: '#d4d4d8',
    fontSize: 13,
    paddingRight: 8,
  },
  cellStrong: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
    flexShrink: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
