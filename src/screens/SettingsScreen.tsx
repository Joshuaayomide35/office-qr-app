import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { pickAndUploadAvatar } from '../lib/avatar';
import Avatar from '../components/Avatar';
import {
  notificationsSupported,
  requestNotificationPermission,
  scheduleCheckoutReminder,
  cancelCheckoutReminder,
} from '../lib/notifications';

const parseTime = (value: string): { hour: number; minute: number } | null => {
  const match = value.trim().match(/^([0-1]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return { hour: parseInt(match[1], 10), minute: parseInt(match[2], 10) };
};

const formatTime = (hour: number, minute: number) =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

export default function SettingsScreen() {
  const { user, role, avatarUrl, refreshProfile, closingTime } = useAuth();

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const [timeInput, setTimeInput] = useState(closingTime || '18:00');
  const [reminderEnabled, setReminderEnabled] = useState(!!closingTime);
  const [savingReminder, setSavingReminder] = useState(false);
  const [reminderError, setReminderError] = useState('');
  const [reminderSaved, setReminderSaved] = useState(false);

  const handleChangePhoto = async () => {
    if (!user) return;
    setPhotoError('');
    setUploadingPhoto(true);
    const { error } = await pickAndUploadAvatar(user.id);
    if (error) setPhotoError(error);
    else await refreshProfile();
    setUploadingPhoto(false);
  };

  const handleToggleReminder = async (value: boolean) => {
    setReminderEnabled(value);
    setReminderError('');
    setReminderSaved(false);

    if (!value) {
      await cancelCheckoutReminder();
      if (user) await supabase.from('profiles').update({ closing_time: null }).eq('id', user.id);
      return;
    }

    const parsed = parseTime(timeInput);
    if (!parsed) {
      setReminderError('Enter a valid time as HH:MM, e.g. 18:00');
      setReminderEnabled(false);
      return;
    }

    await saveReminder(parsed.hour, parsed.minute);
  };

  const saveReminder = async (hour: number, minute: number) => {
    setSavingReminder(true);
    setReminderError('');

    if (notificationsSupported) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setReminderError('Notification permission was denied. Enable it in your device settings.');
        setSavingReminder(false);
        setReminderEnabled(false);
        return;
      }
      await scheduleCheckoutReminder(hour, minute);
    }

    if (user) {
      await supabase.from('profiles').update({ closing_time: formatTime(hour, minute) }).eq('id', user.id);
    }

    setSavingReminder(false);
    setReminderSaved(true);
  };

  const handleSaveTime = async () => {
    const parsed = parseTime(timeInput);
    if (!parsed) {
      setReminderError('Enter a valid time as HH:MM, e.g. 18:00');
      return;
    }
    await saveReminder(parsed.hour, parsed.minute);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.profileCard}>
        <TouchableOpacity onPress={handleChangePhoto} disabled={uploadingPhoto} activeOpacity={0.8} style={styles.avatarWrap}>
          <Avatar uri={avatarUrl} name={user?.email || 'U'} size={72} />
          <View style={styles.avatarEditBadge}>
            {uploadingPhoto ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="camera" size={13} color="#ffffff" />}
          </View>
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{role === 'admin' ? 'Admin' : 'Employee'}</Text>
          </View>
        </View>
      </View>
      {photoError ? <Text style={styles.errorText}>{photoError}</Text> : null}

      <Text style={styles.sectionLabel}>Checkout Reminder</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Remind me to check out</Text>
            <Text style={styles.rowSubtitle}>
              {notificationsSupported ? 'A daily notification at your closing time.' : 'Notifications require the mobile app.'}
            </Text>
          </View>
          <Switch
            value={reminderEnabled}
            onValueChange={handleToggleReminder}
            trackColor={{ false: '#27272a', true: '#6366f1' }}
            thumbColor="#ffffff"
          />
        </View>

        {reminderEnabled && (
          <View style={styles.timeRow}>
            <TextInput
              style={styles.timeInput}
              value={timeInput}
              onChangeText={(t) => { setTimeInput(t); setReminderSaved(false); }}
              placeholder="18:00"
              placeholderTextColor="#52525b"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
            <TouchableOpacity style={styles.saveTimeButton} onPress={handleSaveTime} disabled={savingReminder} activeOpacity={0.8}>
              {savingReminder ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.saveTimeText}>Save</Text>}
            </TouchableOpacity>
          </View>
        )}

        {reminderError ? <Text style={styles.errorText}>{reminderError}</Text> : null}
        {reminderSaved ? (
          <View style={styles.savedRow}>
            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
            <Text style={styles.savedText}>Reminder set for {timeInput}</Text>
          </View>
        ) : null}
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingBottom: 40,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#121214',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    marginBottom: 6,
  },
  avatarWrap: {
    // @ts-ignore
    cursor: 'pointer',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#121214',
  },
  profileInfo: {
    flex: 1,
  },
  email: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleBadgeText: {
    color: '#6366f1',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sectionLabel: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 24,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#121214',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 2,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  timeInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#ffffff',
    fontSize: 15,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  saveTimeButton: {
    width: 80,
    height: 44,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveTimeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  savedText: {
    color: '#10b981',
    fontSize: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 10,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    marginTop: 32,
    // @ts-ignore
    cursor: 'pointer',
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '700',
  },
});
