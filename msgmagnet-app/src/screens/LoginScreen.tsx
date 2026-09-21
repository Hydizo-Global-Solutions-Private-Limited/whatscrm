import React, { useState, useEffect } from 'react';
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
import { Lock, Mail, Server, ArrowRight, User, Phone, CheckSquare, Square, UserPlus, LogIn } from 'lucide-react-native';

export const LoginScreen = () => {
  const { login, signup, isLoading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [email, setEmail] = useState('user@user.com');
  const [password, setPassword] = useState('admin123');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [acceptPolicy, setAcceptPolicy] = useState(true);

  // Server URL override
  const [customServerUrl, setCustomServerUrl] = useState(api.defaults.baseURL || 'http://192.168.1.2:3010');
  const [showServerConfig, setShowServerConfig] = useState(false);

  useEffect(() => {
    if (api.defaults.baseURL) {
      setCustomServerUrl(api.defaults.baseURL);
    }
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password');
      return;
    }

    const targetUrl = (customServerUrl && customServerUrl.trim()) ? customServerUrl.trim() : 'http://192.168.1.2:3010';
    await setBaseUrl(targetUrl);

    const res = await login({ email: email.trim(), password });
    if (!res.success) {
      Alert.alert('Login Failed', res.msg || 'Please check your credentials or server connection.');
    }
  };

  const handleRegister = async () => {
    if (!regName.trim() || !regEmail.trim() || !regMobile.trim() || !regPassword) {
      Alert.alert('Missing Fields', 'Please fill in all registration fields.');
      return;
    }

    if (!acceptPolicy) {
      Alert.alert('Terms & Conditions', 'Please accept the Terms of Service & Privacy Policy to create an account.');
      return;
    }

    const targetUrl = (customServerUrl && customServerUrl.trim()) ? customServerUrl.trim() : 'http://192.168.1.2:3010';
    await setBaseUrl(targetUrl);

    const res = await signup({
      name: regName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      mobile_with_country_code: regMobile.trim(),
      acceptPolicy: true,
    });

    if (!res.success) {
      Alert.alert('Registration Failed', res.msg || 'Could not complete registration. Please try again.');
    } else {
      Alert.alert('Welcome!', 'Your account has been created and signed in successfully.');
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
          {/* Segmented Auth Mode Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, authMode === 'login' && styles.tabBtnActive]}
              onPress={() => setAuthMode('login')}
            >
              <LogIn size={16} color={authMode === 'login' ? '#ffffff' : '#64748b'} />
              <Text style={[styles.tabBtnText, authMode === 'login' && styles.tabBtnTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, authMode === 'register' && styles.tabBtnActive]}
              onPress={() => setAuthMode('register')}
            >
              <UserPlus size={16} color={authMode === 'register' ? '#ffffff' : '#64748b'} />
              <Text style={[styles.tabBtnText, authMode === 'register' && styles.tabBtnTextActive]}>
                Register
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.formTitle}>
            {authMode === 'login' ? 'Sign In to Workspace' : 'Create New Account'}
          </Text>

          {/* SIGN IN FORM */}
          {authMode === 'login' ? (
            <>
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
            </>
          ) : (
            /* REGISTRATION FORM */
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <View style={styles.inputContainer}>
                  <User color="#64748b" size={18} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. John Doe"
                    placeholderTextColor="#475569"
                    value={regName}
                    onChangeText={setRegName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Work Email</Text>
                <View style={styles.inputContainer}>
                  <Mail color="#64748b" size={18} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="john@company.com"
                    placeholderTextColor="#475569"
                    value={regEmail}
                    onChangeText={setRegEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mobile (with Country Code)</Text>
                <View style={styles.inputContainer}>
                  <Phone color="#64748b" size={18} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="+1 555 123 4567 or +91..."
                    placeholderTextColor="#475569"
                    value={regMobile}
                    onChangeText={setRegMobile}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Create Password</Text>
                <View style={styles.inputContainer}>
                  <Lock color="#64748b" size={18} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Min 6 characters"
                    placeholderTextColor="#475569"
                    value={regPassword}
                    onChangeText={setRegPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              {/* Terms Checkbox */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAcceptPolicy(!acceptPolicy)}
                activeOpacity={0.7}
              >
                {acceptPolicy ? (
                  <CheckSquare size={18} color="#3b82f6" />
                ) : (
                  <Square size={18} color="#64748b" />
                )}
                <Text style={styles.checkboxLabel}>
                  I accept the <Text style={styles.termsLink}>Terms of Service</Text> & <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Server Config Accordion */}
          {showServerConfig && (
            <View style={[styles.inputGroup, { marginTop: 10 }]}>
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
              {showServerConfig ? 'Hide Server Configuration' : `⚙️ Server: ${customServerUrl || 'http://192.168.1.2:3010'}`}
            </Text>
          </TouchableOpacity>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
            onPress={authMode === 'login' ? handleLogin : handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.primaryBtnText}>
                  {authMode === 'login' ? 'Sign In' : 'Create Account & Sign In'}
                </Text>
                {authMode === 'login' ? (
                  <ArrowRight color="#ffffff" size={18} />
                ) : (
                  <UserPlus color="#ffffff" size={18} />
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* Switch Tab Footer Link */}
          <TouchableOpacity
            style={styles.switchAuthLink}
            onPress={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
          >
            <Text style={styles.switchAuthText}>
              {authMode === 'login'
                ? "Don't have an account? "
                : "Already have an account? "}
              <Text style={styles.switchAuthHighlight}>
                {authMode === 'login' ? 'Register here' : 'Sign In'}
              </Text>
            </Text>
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
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0b0f19',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 14,
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#94a3b8',
    flex: 1,
  },
  termsLink: {
    color: '#60a5fa',
    fontWeight: '600',
  },
  toggleServerBtn: {
    alignSelf: 'center',
    marginVertical: 8,
  },
  toggleServerText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  switchAuthLink: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  switchAuthText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  switchAuthHighlight: {
    color: '#3b82f6',
    fontWeight: '700',
  },
  footer: {
    marginTop: 28,
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
