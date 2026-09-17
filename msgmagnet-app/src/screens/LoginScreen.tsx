import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { setBaseUrl, api } from '../api/client';
import { Lock, Mail, Server, ArrowRight } from 'lucide-react-native';

export const LoginScreen = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('user@user.com');
  const [password, setPassword] = useState('admin123');
  const [customServerUrl, setCustomServerUrl] = useState(api.defaults.baseURL || 'http://localhost:3010');
  const [showServerConfig, setShowServerConfig] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password');
      return;
    }

    if (showServerConfig && customServerUrl) {
      await setBaseUrl(customServerUrl);
    }

    const res = await login({ email, password });
    if (!res.success) {
      Alert.alert('Login Failed', res.msg || 'Please check your credentials or server connection.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>⚡ MM</Text>
          </View>
          <Text style={styles.title}>MsgMagnet</Text>
          <Text style={styles.subtitle}>AI-Powered Omnichannel CRM & Field Networking</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Sign In to Workspace</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Mail color="#64748b" size={18} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="name@company.com"
                placeholderTextColor="#475569"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Lock color="#64748b" size={18} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#475569"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          {showServerConfig && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Server API URL</Text>
              <View style={styles.inputContainer}>
                <Server color="#64748b" size={18} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="http://192.168.1.100:3010"
                  placeholderTextColor="#475569"
                  value={customServerUrl}
                  onChangeText={setCustomServerUrl}
                  autoCapitalize="none"
                />
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.toggleServerBtn}
            onPress={() => setShowServerConfig(!showServerConfig)}
          >
            <Text style={styles.toggleServerText}>
              {showServerConfig ? 'Hide Server Configuration' : '⚙️ Configure Backend Host / IP'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.loginBtnText}>Sign In</Text>
                <ArrowRight color="#ffffff" size={18} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>MsgMagnet Enterprise Edition v2.0</Text>
          <Text style={styles.footerSub}>Gemini AI Vision & Baileys WhatsApp Powered</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  logoBadgeText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 6,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b0f19',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    height: 48,
    fontSize: 15,
  },
  toggleServerBtn: {
    alignSelf: 'center',
    marginVertical: 10,
  },
  toggleServerText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
  },
  loginBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  footerSub: {
    color: '#475569',
    fontSize: 11,
    marginTop: 4,
  },
});
