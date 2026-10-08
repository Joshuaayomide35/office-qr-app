import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

export default function RegisterScreen() {
  const navigation = useNavigation<NavigationProp>();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  
  const [errorMessage, setErrorMessage] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handlePhoneChange = (text: string) => {
    const sanitized = text.replace(/[^0-9]/g, '');
    setPhoneNumber(sanitized);
  };

  const handleRegister = async () => {
    console.log('[RegisterScreen] Register button clicked');
    console.log('[RegisterScreen] Form values before validation:', { fullName, email, phoneNumber, passwordLength: password.length });
    
    setErrorMessage('');
    let newErrors: { [key: string]: string } = {};

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters.';
    }
    if (!validateEmail(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (phoneNumber.length < 10 || phoneNumber.length > 11) {
      newErrors.phoneNumber = 'Phone number must be 10 or 11 digits.';
    }
    if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (Object.keys(newErrors).length > 0) {
      console.log('[RegisterScreen] Validation failed:', newErrors);
      setErrors(newErrors);
      setErrorMessage('Please fix the errors in the form before submitting.');
      return;
    }

    setErrors({});
    setLoading(true);
    
    try {
      const formattedPhone = `+234${phoneNumber}`;
      console.log('[RegisterScreen] Form valid, attempting Supabase signUp...');

      // 1. Sign up user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
            phone_number: formattedPhone
          }
        }
      });

      if (authError) {
        console.error('[RegisterScreen] Supabase signUp error:', authError);
        setErrorMessage(authError.message);
        return;
      }

      console.log('[RegisterScreen] Supabase signUp success:', authData);
      // The profiles row is created server-side by the on_auth_user_created
      // trigger (see supabase-trigger.sql), from the full_name/phone_number
      // passed in options.data above. The AuthContext will detect the
      // session and route to the Waiting Room / Home screen.
    } catch (error: any) {
      console.error('[RegisterScreen] Unexpected error during registration:', error);
      setErrorMessage(error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
      console.log('[RegisterScreen] Registration flow completed (finally block)');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Create an account</Text>
            <Text style={styles.subtitle}>Enter your details to access the office dashboard.</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={[styles.input, errors.fullName && styles.inputError]}
              placeholder="John Doe"
              placeholderTextColor="#a1a1aa"
              value={fullName}
              onChangeText={(text) => { setFullName(text); setErrors(prev => ({...prev, fullName: ''})); setErrorMessage(''); }}
              autoCapitalize="words"
            />
            {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="name@example.com"
              placeholderTextColor="#a1a1aa"
              value={email}
              onChangeText={(text) => { setEmail(text); setErrors(prev => ({...prev, email: ''})); setErrorMessage(''); }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={[styles.phoneInputContainer, errors.phoneNumber && styles.inputError]}>
              <View style={styles.phonePrefixContainer}>
                <Text style={styles.phonePrefixText}>🇳🇬 +234</Text>
                <View style={styles.phoneDivider} />
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="801 234 5678"
                placeholderTextColor="#a1a1aa"
                value={phoneNumber}
                onChangeText={(text) => { handlePhoneChange(text); setErrors(prev => ({...prev, phoneNumber: ''})); setErrorMessage(''); }}
                keyboardType="number-pad"
                maxLength={11}
              />
            </View>
            {errors.phoneNumber ? <Text style={styles.errorText}>{errors.phoneNumber}</Text> : null}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="••••••••"
              placeholderTextColor="#a1a1aa"
              value={password}
              onChangeText={(text) => { setPassword(text); setErrors(prev => ({...prev, password: ''})); setErrorMessage(''); }}
              secureTextEntry
            />
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.globalErrorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleRegister} 
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Register</Text>}
          </TouchableOpacity>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    padding: 32,
    borderWidth: 1,
    borderColor: '#27272a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a1a1aa',
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    paddingHorizontal: 16,
    color: '#ffffff',
    fontSize: 15,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  phoneInputContainer: {
    height: 48,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  phonePrefixContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    height: '100%',
  },
  phonePrefixText: {
    color: '#ffffff',
    fontSize: 15,
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#3f3f46',
    marginHorizontal: 12,
  },
  phoneInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    height: '100%',
    paddingRight: 16,
    // @ts-ignore - for web cursor
    cursor: 'text',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 16,
  },
  globalErrorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    height: 48,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    // @ts-ignore - for web cursor
    cursor: 'pointer',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  footerLink: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
    // @ts-ignore
    cursor: 'pointer',
  },
});
