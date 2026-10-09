import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { pickAndUploadAvatar } from '../lib/avatar';
import Avatar from '../components/Avatar';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const { user, role, avatarUrl, refreshProfile } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [profileName, setProfileName] = useState('');
  const [lastScanType, setLastScanType] = useState<'check_in' | 'check_out' | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch profile name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (profile) setProfileName(profile.full_name);

    // Fetch last attendance log
    const { data: logs } = await supabase
      .from('attendance_logs')
      .select('scan_type')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (logs && logs.length > 0) {
      setLastScanType(logs[0].scan_type as 'check_in' | 'check_out');
    } else {
      setLastScanType('check_out'); // Default: user needs to check in first
    }

    if (role === 'admin') {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      setPendingCount(count || 0);
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleChangePhoto = async () => {
    if (!user) return;
    setPhotoError('');
    setUploadingPhoto(true);
    const { error } = await pickAndUploadAvatar(user.id);
    if (error) {
      setPhotoError(error);
    } else {
      await refreshProfile();
    }
    setUploadingPhoto(false);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const isCheckedIn = lastScanType === 'check_in';
  const nextAction = isCheckedIn ? 'Check Out' : 'Check In';
  const actionColor = isCheckedIn ? '#ef4444' : '#10b981';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          
          <View style={styles.header}>
            <TouchableOpacity onPress={handleChangePhoto} disabled={uploadingPhoto} activeOpacity={0.8} style={styles.avatarWrap}>
              <Avatar uri={avatarUrl} name={profileName || 'U'} size={84} />
              <View style={styles.avatarEditBadge}>
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="camera" size={14} color="#ffffff" />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.greetingText}>Hello, {profileName}</Text>
            {photoError ? <Text style={styles.photoErrorText}>{photoError}</Text> : null}
          </View>

          <View style={styles.statusSection}>
            <Text style={styles.statusLabel}>Current Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: isCheckedIn ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
              <View style={[styles.statusDot, { backgroundColor: isCheckedIn ? '#10b981' : '#ef4444' }]} />
              <Text style={[styles.statusText, { color: isCheckedIn ? '#10b981' : '#ef4444' }]}>
                {isCheckedIn ? 'Checked In' : 'Checked Out'}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.primaryButton, { backgroundColor: actionColor }]} 
            onPress={() => navigation.navigate('Scanner')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Scan QR to {nextAction}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={fetchData}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Refresh Status</Text>
          </TouchableOpacity>

          {role === 'admin' && (
            <>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: '#6366f1' }]}
                onPress={() => navigation.navigate('CreateEmployee')}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryButtonText, { color: '#6366f1' }]}>Create Employee Account</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: '#6366f1', marginTop: -16 }]}
                onPress={() => navigation.navigate('PrintQR')}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryButtonText, { color: '#6366f1' }]}>Print Check-In QR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: '#6366f1', marginTop: -16 }]}
                onPress={() => navigation.navigate('Admin')}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryButtonText, { color: '#6366f1' }]}>View Employees</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: '#6366f1', marginTop: -16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }]}
                onPress={() => navigation.navigate('Approvals')}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryButtonText, { color: '#6366f1' }]}>Pending Approvals</Text>
                {pendingCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pendingCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={styles.footer}>
            <TouchableOpacity onPress={handleSignOut} activeOpacity={0.6}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

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
  avatarWrap: {
    marginBottom: 14,
    // @ts-ignore
    cursor: 'pointer',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#121214',
  },
  photoErrorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
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
    marginBottom: 32,
    // @ts-ignore
    cursor: 'pointer',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    paddingTop: 16,
  },
  signOutText: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '500',
    // @ts-ignore
    cursor: 'pointer',
  },
});
