import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'EmployeeCalendar'>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'EmployeeCalendar'>;

type LogEntry = {
  id: string;
  scan_type: 'check_in' | 'check_out';
  timestamp: string;
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ymd = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const buildMonthGrid = (year: number, month: number): (Date | null)[][] => {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
};

export default function EmployeeCalendarScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const { employeeId, employeeName } = route.params;

  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [logsByDay, setLogsByDay] = useState<Map<string, LogEntry[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>(ymd(today));
  const [errorMessage, setErrorMessage] = useState('');

  const fetchMonth = useCallback(async () => {
    setErrorMessage('');
    setLoading(true);

    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);

    const { data, error } = await supabase
      .from('attendance_logs')
      .select('id, scan_type, timestamp')
      .eq('user_id', employeeId)
      .gte('timestamp', monthStart.toISOString())
      .lt('timestamp', monthEnd.toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const map = new Map<string, LogEntry[]>();
    for (const log of (data as LogEntry[]) || []) {
      const key = ymd(new Date(log.timestamp));
      const existing = map.get(key) || [];
      existing.push(log);
      map.set(key, existing);
    }
    setLogsByDay(map);
    setLoading(false);
  }, [cursor, employeeId]);

  useEffect(() => {
    fetchMonth();
  }, [fetchMonth]);

  const weeks = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const selectedLogs = logsByDay.get(selectedDay) || [];
  const todayKey = ymd(today);

  const changeMonth = (delta: number) => {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="#6366f1" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>{employeeName}</Text>
          <Text style={styles.subtitle}>Attendance calendar</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => changeMonth(-1)} activeOpacity={0.7} style={styles.monthNavButton}>
            <Ionicons name="chevron-back" size={18} color="#a1a1aa" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} activeOpacity={0.7} style={styles.monthNavButton}>
            <Ionicons name="chevron-forward" size={18} color="#a1a1aa" />
          </TouchableOpacity>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.calendarCard}>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => (
              <Text key={i} style={styles.weekdayLabel}>{w}</Text>
            ))}
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color="#6366f1" />
            </View>
          ) : (
            weeks.map((week, wi) => (
              <View key={wi} style={styles.weekRow}>
                {week.map((date, di) => {
                  if (!date) return <View key={di} style={styles.dayCell} />;
                  const key = ymd(date);
                  const dayLogs = logsByDay.get(key) || [];
                  const hasCheckIn = dayLogs.some((l) => l.scan_type === 'check_in');
                  const isSelected = key === selectedDay;
                  const isToday = key === todayKey;

                  return (
                    <TouchableOpacity
                      key={di}
                      style={[
                        styles.dayCell,
                        isSelected && styles.dayCellSelected,
                        isToday && !isSelected && styles.dayCellToday,
                      ]}
                      onPress={() => setSelectedDay(key)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>{date.getDate()}</Text>
                      {hasCheckIn && <View style={[styles.dayDot, isSelected && styles.dayDotSelected]} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          )}
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>
            {new Date(selectedDay + 'T00:00:00').toLocaleDateString(undefined, {
              weekday: 'long', month: 'long', day: 'numeric',
            })}
          </Text>

          {selectedLogs.length === 0 ? (
            <View style={styles.noRecordWrap}>
              <Ionicons name="close-circle-outline" size={20} color="#71717a" />
              <Text style={styles.noRecordText}>Not available this day</Text>
            </View>
          ) : (
            selectedLogs.map((log) => {
              const isCheckIn = log.scan_type === 'check_in';
              return (
                <View key={log.id} style={styles.logRow}>
                  <View style={[styles.logIcon, { backgroundColor: isCheckIn ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)' }]}>
                    <Ionicons
                      name={isCheckIn ? 'arrow-down-circle' : 'arrow-up-circle'}
                      size={16}
                      color={isCheckIn ? '#10b981' : '#ef4444'}
                    />
                  </View>
                  <Text style={styles.logLabel}>{isCheckIn ? 'Checked In' : 'Checked Out'}</Text>
                  <Text style={styles.logTime}>
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </Text>
                </View>
              );
            })
          )}
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
    fontSize: 17,
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
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  monthNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  monthLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    minWidth: 160,
    textAlign: 'center',
  },
  calendarCard: {
    backgroundColor: '#121214',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 12,
    marginBottom: 16,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekdayLabel: {
    width: 40,
    textAlign: 'center',
    color: '#71717a',
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 8,
  },
  dayCell: {
    width: 40,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    // @ts-ignore
    cursor: 'pointer',
  },
  dayCellSelected: {
    backgroundColor: '#6366f1',
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  dayNumber: {
    color: '#e4e4e7',
    fontSize: 13,
    fontWeight: '500',
  },
  dayNumberSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10b981',
    marginTop: 3,
  },
  dayDotSelected: {
    backgroundColor: '#ffffff',
  },
  detailCard: {
    backgroundColor: '#121214',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 18,
  },
  detailTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  noRecordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  noRecordText: {
    color: '#71717a',
    fontSize: 14,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f23',
  },
  logIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logLabel: {
    flex: 1,
    color: '#e4e4e7',
    fontSize: 14,
    fontWeight: '500',
  },
  logTime: {
    color: '#a1a1aa',
    fontSize: 13,
  },
});
