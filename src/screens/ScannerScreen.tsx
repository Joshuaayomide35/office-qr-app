import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { OFFICE_CHECKIN_TOKEN } from '../constants/qrPayload';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Scanner'>;

// Helper to timeout long-running promises (like GPS or DB calls)
const withTimeout = <T,>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms))
  ]);
};

export default function ScannerScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<Location.LocationPermissionResponse | null>(null);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    (async () => {
      try {
        const locationStatus = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(locationStatus);
      } catch (err) {
        console.error("Location permission error:", err);
      }
    })();
  }, []);

  if (!cameraPermission || !locationPermission) {
    return <View style={styles.container}><ActivityIndicator size="large" color="#6366f1" /></View>;
  }

  if (!cameraPermission.granted || !locationPermission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.messageBox}>
          <Text style={styles.errorText}>Camera and Location permissions are required to scan QR codes.</Text>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => {
              requestCameraPermission();
              Location.requestForegroundPermissionsAsync().then(setLocationPermission);
            }}
          >
            <Text style={styles.buttonText}>Request Permissions Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || processing) return;
    
    setScanned(true);
    setProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    console.log('[ScannerScreen] QR Code scanned:', data);

    try {
      // 1. Strict Validation
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        throw new Error('Invalid QR Code - Please scan the official front desk screen.');
      }

      if (parsedData.type !== 'office_checkin' || parsedData.token !== OFFICE_CHECKIN_TOKEN) {
        throw new Error('Invalid QR Code - Please scan the official office check-in code.');
      }

      console.log('[ScannerScreen] Fetching location...');
      
      // 2. Fetch Location with 10s timeout
      const location = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Platform.OS === 'web' ? Location.Accuracy.Balanced : Location.Accuracy.High,
        }),
        10000,
        'GPS request timed out. Please check your signal and try again.'
      );
      
      console.log('[ScannerScreen] Location obtained:', location.coords);

      // 3. Determine next scan type
      const { data: logs } = await withTimeout(
        supabase
          .from('attendance_logs')
          .select('scan_type')
          .eq('user_id', user!.id)
          .order('timestamp', { ascending: false })
          .limit(1),
        10000,
        'Database request timed out while fetching status.'
      );
      
      const nextScanType = (logs && logs.length > 0 && logs[0].scan_type === 'check_in') ? 'check_out' : 'check_in';
      console.log('[ScannerScreen] Next scan type calculated as:', nextScanType);

      // 4. Insert log with 10s timeout
      const { error } = await withTimeout(
        supabase.from('attendance_logs').insert([
          {
            user_id: user!.id,
            scan_type: nextScanType,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }
        ]),
        10000,
        'Database request timed out while saving check-in.'
      );

      if (error) {
        throw new Error(error.message || 'Database error occurred.');
      }

      console.log('[ScannerScreen] Successfully recorded scan!');
      setSuccessMessage(`Successfully ${nextScanType === 'check_in' ? 'Checked In' : 'Checked Out'}!`);
      
      // Auto navigate back
      setTimeout(() => {
        navigation.navigate('Home');
      }, 2000);

    } catch (error: any) {
      console.error('[ScannerScreen] Error:', error);
      setErrorMessage(error.message || 'Failed to process scan. Please try again.');
    } finally {
      // Ensure processing stops no matter what
      setProcessing(false);
      console.log('[ScannerScreen] Processing finished.');
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setErrorMessage('');
    setSuccessMessage('');
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />
      
      <View style={styles.headerOverlay}>
        <Text style={styles.headerText}>Align QR Code within the frame</Text>
      </View>

      {processing && !errorMessage && !successMessage && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.overlayText}>Processing Scan...</Text>
        </View>
      )}

      {errorMessage ? (
        <View style={styles.overlay}>
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={resetScanner}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {successMessage ? (
        <View style={styles.overlay}>
          <View style={[styles.errorBox, { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
            <Text style={[styles.errorBoxText, { color: '#10b981' }]}>{successMessage}</Text>
            <ActivityIndicator size="small" color="#10b981" style={{ marginTop: 12 }} />
          </View>
        </View>
      ) : null}

      {!processing && !scanned && (
        <View style={styles.buttonContainer}>
           <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
             <Text style={styles.buttonText}>Cancel</Text>
           </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'center',
  },
  headerOverlay: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  headerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  messageBox: {
    padding: 24,
    backgroundColor: '#121214',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    margin: 20,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayText: {
    color: '#10b981',
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
  },
  errorBox: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#121214',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
    alignItems: 'center',
  },
  errorBoxText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    width: '100%',
    height: 48,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: 32,
    height: 48,
    backgroundColor: '#ef4444',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#a1a1aa',
    fontSize: 16,
    fontWeight: '500',
  },
});
