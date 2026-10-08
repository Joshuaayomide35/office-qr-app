import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Button, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Scanner'>;

export default function ScannerScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<Location.LocationPermissionResponse | null>(null);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    (async () => {
      const locationStatus = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(locationStatus);
    })();
  }, []);

  if (!cameraPermission || !locationPermission) {
    return <View style={styles.container}><ActivityIndicator size="large" /></View>;
  }

  if (!cameraPermission.granted || !locationPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera and Location permissions are required to scan QR codes.</Text>
        <Button title="Request Permissions Again" onPress={() => {
          requestCameraPermission();
          Location.requestForegroundPermissionsAsync().then(setLocationPermission);
        }} />
        <Button title="Go Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);

    try {
      // Basic payload validation - assume valid QR codes are prefixed or matched, 
      // but for this example, we proceed as long as it scans successfully.
      
      // Get High Accuracy Location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Determine next scan type (check-in or check-out)
      // For a robust app, we might embed the intended action in the QR or rely on the server state.
      // Here we check last log to flip the status.
      const { data: logs } = await supabase
        .from('attendance_logs')
        .select('scan_type')
        .eq('user_id', user!.id)
        .order('timestamp', { ascending: false })
        .limit(1);
      
      const nextScanType = (logs && logs.length > 0 && logs[0].scan_type === 'check_in') ? 'check_out' : 'check_in';

      // Insert into attendance_logs
      const { error } = await supabase.from('attendance_logs').insert([
        {
          user_id: user!.id,
          scan_type: nextScanType,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }
      ]);

      if (error) {
        Alert.alert('Scan Failed', error.message, [
          { text: 'OK', onPress: () => { setScanned(false); setProcessing(false); } }
        ]);
        return;
      }

      Alert.alert('Success', `Successfully ${nextScanType === 'check_in' ? 'Checked In' : 'Checked Out'}!`, [
        { text: 'OK', onPress: () => navigation.navigate('Home') }
      ]);
    } catch (error: any) {
      Alert.alert('Error processing scan', error.message, [
        { text: 'OK', onPress: () => { setScanned(false); setProcessing(false); } }
      ]);
    }
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
      {processing && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.overlayText}>Processing...</Text>
        </View>
      )}
      {!processing && (
        <View style={styles.buttonContainer}>
           <Button title="Cancel" onPress={() => navigation.goBack()} color="#FF3B30" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  errorText: {
    textAlign: 'center',
    margin: 20,
    fontSize: 16,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: '#fff',
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
