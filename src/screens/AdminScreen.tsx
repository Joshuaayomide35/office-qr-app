import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
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
  name: 160,
  email: 220,
  type: 110,
  date: 120,
  time: 110,
};

const TABLE_WIDTH = Object.values(COLUMN_WIDTHS).reduce((a, b) => a + b, 0);

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

  const TableHeader = () => (
    <View style={[styles.headerRow, { width: TABLE_WIDTH }]}>
      <Text style={[styles.headerCell, { width: COLUMN_WIDTHS.name }]}>Name</Text>
      <Text style={[styles.headerCell, { width: COLUMN_WIDTHS.email }]}>Email</Text>
      <Text style={[styles.headerCell, { width: COLUMN_WIDTHS.type }]}>Type</Text>
      <Text style={[styles.headerCell, { width: COLUMN_WIDTHS.date }]}>Date</Text>
      <Text style={[styles.headerCell, { width: COLUMN_WIDTHS.time }]}>Time</Text>
    </View>
  );

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

      <ScrollView horizontal showsHorizontalScrollIndicator={rows.length > 0}>
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          style={{ width: TABLE_WIDTH }}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
          stickyHeaderIndices={[0]}
          ListHeaderComponent={TableHeader}
          ListEmptyComponent={<Text style={styles.emptyText}>No attendance records yet.</Text>}
          renderItem={({ item, index }) => {
            const date = new Date(item.timestamp);
            const isCheckIn = item.scan_type === 'check_in';
            return (
              <View style={[styles.dataRow, index % 2 === 1 && styles.dataRowAlt]}>
                <Text style={[styles.cell, styles.cellStrong, { width: COLUMN_WIDTHS.name }]} numberOfLines={1}>
                  {item.profiles?.full_name || 'Unknown'}
                </Text>
                <Text style={[styles.cell, { width: COLUMN_WIDTHS.email }]} numberOfLines={1}>
                  {item.profiles?.email || '-'}
                </Text>
                <View style={{ width: COLUMN_WIDTHS.type }}>
                  <View style={[styles.badge, { backgroundColor: isCheckIn ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)' }]}>
                    <Text style={[styles.badgeText, { color: isCheckIn ? '#10b981' : '#ef4444' }]}>
                      {isCheckIn ? 'Check In' : 'Check Out'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cell, { width: COLUMN_WIDTHS.date }]}>{date.toLocaleDateString()}</Text>
                <Text style={[styles.cell, { width: COLUMN_WIDTHS.time }]}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            );
          }}
        />
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
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyText: {
    color: '#a1a1aa',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
    width: TABLE_WIDTH,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#09090b',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#27272a',
    marginTop: 16,
  },
  headerCell: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingRight: 8,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f23',
  },
  dataRowAlt: {
    backgroundColor: '#121214',
  },
  cell: {
    color: '#e4e4e7',
    fontSize: 13,
    paddingRight: 8,
  },
  cellStrong: {
    color: '#ffffff',
    fontWeight: '600',
  },
  badge: {
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
