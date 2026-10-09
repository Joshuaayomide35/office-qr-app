import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function WaitingRoomScreen() {
  const { status, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);

  const isRejected = status === 'rejected';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: isRejected ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)' }]}>
          <Ionicons
            name={isRejected ? 'close-circle-outline' : 'time-outline'}
            size={36}
            color={isRejected ? '#ef4444' : '#f59e0b'}
          />
        </View>

        <Text style={styles.title}>{isRejected ? 'Access Denied' : 'Awaiting Approval'}</Text>
        <Text style={styles.message}>
          {isRejected
            ? 'Your access request was declined by an administrator. Contact your office admin if you believe this is a mistake.'
            : 'Your account is pending review. An office administrator needs to approve your access before you can check in.'}
        </Text>

        <TouchableOpacity style={styles.primaryButton} onPress={handleRefresh} disabled={refreshing} activeOpacity={0.8}>
          {refreshing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="refresh" size={16} color="#ffffff" />
              <Text style={styles.primaryButtonText}>Check Status Again</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.7}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#121214',
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    color: '#a1a1aa',
    marginBottom: 28,
    lineHeight: 21,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
    height: 48,
    borderRadius: 10,
    width: '100%',
    marginBottom: 12,
    // @ts-ignore
    cursor: 'pointer',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  signOutButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    // @ts-ignore
    cursor: 'pointer',
  },
  signOutText: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '500',
  },
});
