import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation } from '@react-navigation/native';

export default function KioskScreen() {
  const navigation = useNavigation();
  const [qrValue, setQrValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);

  const generatePayload = () => {
    const payload = {
      type: 'office_checkin',
      timestamp: Date.now(),
      token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    };
    setQrValue(JSON.stringify(payload));
    setTimeLeft(30);
  };

  useEffect(() => {
    // Generate initial payload
    generatePayload();

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generatePayload();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Determine QR code size based on screen dimensions
  const windowWidth = Dimensions.get('window').width;
  const qrSize = Math.min(windowWidth * 0.7, 300);

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>Exit Kiosk Mode</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Front Desk Check-In</Text>
          <Text style={styles.subtitle}>Scan this code with your employee app to log your attendance.</Text>
        </View>

        <View style={styles.qrContainer}>
          {qrValue ? (
            <QRCode
              value={qrValue}
              size={qrSize}
              backgroundColor="#ffffff"
              color="#000000"
            />
          ) : (
            <View style={{ width: qrSize, height: qrSize, backgroundColor: '#ffffff' }} />
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.timerText}>Refreshing securely in: {timeLeft}s</Text>
        </View>
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
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    // @ts-ignore
    cursor: 'pointer',
  },
  backButtonText: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#121214',
    borderRadius: 24,
    padding: 40,
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 24,
  },
  qrContainer: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 40,
  },
  footer: {
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  timerText: {
    color: '#6366f1',
    fontSize: 15,
    fontWeight: '600',
  },
});
