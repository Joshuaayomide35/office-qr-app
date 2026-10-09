import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/HomeStack';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>;

type DayState = 'not_started' | 'checked_in' | 'completed';

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [profileName, setProfileName] = useState('');
  const [dayState, setDayState] = useState<DayState>('not_started');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (profile) setProfileName(profile.full_name);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: logs } = await supabase
      .from('attendance_logs')
      .select('scan_type')
      .eq('user_id', user.id)
      .gte('timestamp', todayStart.toISOString())
      .order('timestamp', { ascending: true });

    const count = logs?.length || 0;
    setDayState(count >= 2 ? 'completed' : count === 1 ? 'checked_in' : 'not_started');
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [user])
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const isCheckedIn = dayState === 'checked_in';
  const isCompleted = dayState === 'completed';
  const nextAction = isCheckedIn ? 'Check Out' : 'Check In';
  const actionColor = isCheckedIn ? '#ef4444' : '#10b981';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.greetingText}>Hello, {profileName}</Text>
          </View>

          <View style={styles.statusSection}>
            <Text style={styles.statusLabel}>Today's Status</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: isCompleted ? 'rgba(113, 113, 122, 0.15)' : isCheckedIn ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isCompleted ? '#71717a' : isCheckedIn ? '#10b981' : '#ef4444' },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: isCompleted ? '#a1a1aa' : isCheckedIn ? '#10b981' : '#ef4444' },
                ]}
              >
                {isCompleted ? 'Completed for Today' : isCheckedIn ? 'Checked In' : 'Checked Out'}
              </Text>
            </View>
          </View>

          {isCompleted ? (
            <View style={styles.doneBox}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.doneText}>You've checked in and out today. See you tomorrow.</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: actionColor }]}
              onPress={() => navigation.navigate('Scanner')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Scan QR to {nextAction}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.secondaryButton} onPress={fetchData} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>Refresh Status</Text>
          </TouchableOpacity>
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
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#121214',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#27272a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: '#18181b',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  statusLabel: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 8,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
  },
  doneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  doneText: {
    flex: 1,
    color: '#a1a1aa',
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    // @ts-ignore
    cursor: 'pointer',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3f3f46',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore
    cursor: 'pointer',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
});
