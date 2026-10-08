import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
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
        <TouchableOpacity onPress={() => navigation.navigate('Home')} activeOpacity={0.7}>
          <Text style={styles.backLink}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Attendance Log</Text>
        <View style={{ width: 50 }} />
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        ListEmptyComponent={<Text style={styles.emptyText}>No attendance records yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowTop}>
              <Text style={styles.name}>{item.profiles?.full_name || 'Unknown'}</Text>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: item.scan_type === 'check_in' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)' },
                ]}
              >
                <Text style={[styles.badgeText, { color: item.scan_type === 'check_in' ? '#10b981' : '#ef4444' }]}>
                  {item.scan_type === 'check_in' ? 'Check In' : 'Check Out'}
                </Text>
              </View>
            </View>
            <Text style={styles.email}>{item.profiles?.email}</Text>
            <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  backLink: {
    color: '#6366f1',
    fontSize: 15,
    fontWeight: '500',
    width: 50,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  listContent: {
    padding: 16,
  },
  emptyText: {
    color: '#a1a1aa',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  row: {
    backgroundColor: '#121214',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    marginBottom: 12,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  email: {
    color: '#a1a1aa',
    fontSize: 13,
    marginBottom: 6,
  },
  timestamp: {
    color: '#71717a',
    fontSize: 12,
  },
});
