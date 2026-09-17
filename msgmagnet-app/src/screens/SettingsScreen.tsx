import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { MobileApi, api, setBaseUrl } from '../api/client';
import {
  User,
  Shield,
  Zap,
  Server,
  LogOut,
  Layers,
  Sparkles,
  Database,
  Calendar,
  Settings as SettingsIcon,
} from 'lucide-react-native';

export const SettingsScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const [fairUsage, setFairUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [serverUrl, setServerUrl] = useState(api.defaults.baseURL || 'http://localhost:3010');
  const [nameFormat, setNameFormat] = useState<'first_last' | 'last_first'>('first_last');

  useEffect(() => {
    fetchSettingsData();
  }, []);

  const fetchSettingsData = async () => {
    try {
      const res = await MobileApi.getFairUsage();
      if (res.data?.success) {
        setFairUsage(res.data);
      }
    } catch (e) {
      console.warn('Error fetching fair usage settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateServerUrl = async () => {
    if (!serverUrl) return;
    await setBaseUrl(serverUrl);
    Alert.alert('Saved', `Backend API URL updated to: ${serverUrl}`);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of MsgMagnet?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Header */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name || user?.email || 'MM').substring(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name || 'MsgMagnet User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.planPill}>
            <Text style={styles.planText}>{(user?.plan || 'PRO').toUpperCase()} TIER</Text>
          </View>
        </View>
      </View>

      {/* Fair Usage Metering */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Zap color="#f59e0b" size={18} />
          <Text style={styles.sectionTitle}>Fair Usage & AI Quota</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#3b82f6" />
        ) : fairUsage?.usage ? (
          <>
            {/* Card Scans Progress */}
            <View style={styles.meterGroup}>
              <View style={styles.meterHeader}>
                <Text style={styles.meterLabel}>Gemini Card Scans</Text>
                <Text style={styles.meterValue}>
                  {fairUsage.usage.card_scans.used} / {fairUsage.usage.card_scans.limit}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${fairUsage.usage.card_scans.percentage}%`,
                      backgroundColor: '#2563eb',
                    },
                  ]}
                />
              </View>
            </View>

            {/* Voice Minutes Progress */}
            <View style={styles.meterGroup}>
              <View style={styles.meterHeader}>
                <Text style={styles.meterLabel}>AI Voice Notes</Text>
                <Text style={styles.meterValue}>
                  {fairUsage.usage.voice_minutes.used} / {fairUsage.usage.voice_minutes.limit} mins
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${fairUsage.usage.voice_minutes.percentage}%`,
                      backgroundColor: '#a855f7',
                    },
                  ]}
                />
              </View>
            </View>

            {/* Contacts Stored */}
            <View style={styles.meterGroup}>
              <View style={styles.meterHeader}>
                <Text style={styles.meterLabel}>Contacts Stored</Text>
                <Text style={styles.meterValue}>
                  {fairUsage.usage.contacts.used} / {fairUsage.usage.contacts.limit}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${fairUsage.usage.contacts.percentage}%`,
                      backgroundColor: '#10b981',
                    },
                  ]}
                />
              </View>
            </View>
          </>
        ) : (
          <Text style={styles.errorText}>Could not load usage statistics.</Text>
        )}
      </View>

      {/* Preferences Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <SettingsIcon color="#3b82f6" size={18} />
          <Text style={styles.sectionTitle}>Preferences</Text>
        </View>

        <View style={styles.prefRow}>
          <View>
            <Text style={styles.prefLabel}>Contact Name Format</Text>
            <Text style={styles.prefSub}>
              {nameFormat === 'first_last' ? 'First Last (e.g. John Doe)' : 'Last, First (e.g. Doe, John)'}
            </Text>
          </View>
          <Switch
            value={nameFormat === 'last_first'}
            onValueChange={(val) => setNameFormat(val ? 'last_first' : 'first_last')}
            thumbColor="#ffffff"
            trackColor={{ false: '#334155', true: '#2563eb' }}
          />
        </View>
      </View>

      {/* Server Configuration */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Server color="#64748b" size={18} />
          <Text style={styles.sectionTitle}>Backend Connection Host</Text>
        </View>
        <TextInput
          style={styles.serverInput}
          value={serverUrl}
          onChangeText={setServerUrl}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.saveServerBtn} onPress={handleUpdateServerUrl}>
          <Text style={styles.saveServerBtnText}>Update Server URL</Text>
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <LogOut color="#ef4444" size={18} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#3b82f6',
    fontSize: 20,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  userEmail: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  planPill: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  planText: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  meterGroup: {
    marginBottom: 14,
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  meterLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  meterValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#0b0f19',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  errorText: {
    color: '#64748b',
    fontSize: 12,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prefLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  prefSub: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  serverInput: {
    backgroundColor: '#0b0f19',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    color: '#ffffff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  saveServerBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveServerBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 10,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '700',
  },
});
