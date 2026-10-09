import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../navigation/AdminStack';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList, 'CreateEmployee'>;

export default function CreateEmployeeScreen() {
  const navigation = useNavigation<NavigationProp>();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handlePhoneChange = (text: string) => {
    setPhoneNumber(text.replace(/[^0-9]/g, ''));
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhoneNumber('');
    setPassword('');
  };

  const handleCreate = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    const newErrors: { [key: string]: string } = {};

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2) newErrors.fullName = 'Full name must be at least 2 characters.';
    if (!validateEmail(trimmedEmail)) newErrors.email = 'Please enter a valid email address.';
    if (phoneNumber.length < 10 || phoneNumber.length > 11) newErrors.phoneNumber = 'Phone number must be 10 or 11 digits.';
    if (password.length < 6) newErrors.password = 'Password must be at least 6 characters.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setErrorMessage('Please fix the errors below.');
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: trimmedEmail,
          password,
          full_name: trimmedName,
          phone_number: `+234${phoneNumber}`,
        },
      });

      if (error) {
        setErrorMessage(error.message || 'Failed to create account.');
        return;
      }
      if (data?.error) {
        setErrorMessage(data.error);
        return;
      }

      setSuccessMessage(`Account created for ${trimmedEmail}. Share the email and password with them directly.`);
      resetForm();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
              <Ionicons name="chevron-back" size={22} color="#6366f1" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Create Employee Account</Text>
              <Text style={styles.subtitle}>Set their login directly — no self sign-up.</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={[styles.input, errors.fullName && styles.inputError]}
              placeholder="John Doe"
              placeholderTextColor="#a1a1aa"
              value={fullName}
              onChangeText={(text) => { setFullName(text); setErrors((p) => ({ ...p, fullName: '' })); }}
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
              onChangeText={(text) => { setEmail(text); setErrors((p) => ({ ...p, email: '' })); }}
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
                onChangeText={(text) => { handlePhoneChange(text); setErrors((p) => ({ ...p, phoneNumber: '' })); }}
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
              placeholder="Set their login password"
              placeholderTextColor="#a1a1aa"
              value={password}
              onChangeText={(text) => { setPassword(text); setErrors((p) => ({ ...p, password: '' })); }}
              secureTextEntry
            />
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.globalErrorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Create Account</Text>}
          </TouchableOpacity>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 2,
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
    // @ts-ignore
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
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 16,
  },
  successText: {
    color: '#10b981',
    fontSize: 13,
    flexShrink: 1,
  },
  button: {
    height: 48,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    // @ts-ignore
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
});
