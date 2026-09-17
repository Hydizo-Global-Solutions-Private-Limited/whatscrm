import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { MobileApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Phone,
  Mail,
  Building,
  Briefcase,
  Globe,
  Save,
  ShieldCheck,
  Code,
  Sparkles,
  Lock,
} from 'lucide-react-native';

export const ProfileScreen = ({ navigation }: any) => {
  const { refreshProfile } = useAuth();
  const [selectedPersona, setSelectedPersona] = useState<'corporate' | 'freelance' | 'personal'>('corporate');
  const [profile, setProfile] = useState<any>({
    username: '',
    display_name: '',
    title: '',
    headline: '',
    bio: '',
    phone: '',
    whatsapp: '',
    email: '',
    company: '',
    website: '',
    location: '',
    lead_capture_mode: false,
    custom_domain: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile(selectedPersona);
  }, [selectedPersona]);

  const fetchProfile = async (persona: string) => {
    setLoading(true);
    try {
      const res = await MobileApi.getMyProfile(persona);
      if (res.data?.success && res.data.profile) {
        setProfile({
          ...res.data.profile,
          lead_capture_mode: !!res.data.profile.lead_capture_mode,
        });
      } else {
        // Reset defaults for new persona
        setProfile({
          username: '',
          display_name: '',
          title: '',
          headline: '',
          bio: '',
          phone: '',
          whatsapp: '',
          email: '',
          company: '',
          website: '',
          location: '',
          lead_capture_mode: false,
          custom_domain: '',
        });
      }
    } catch (e) {
      console.warn('Error fetching profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile.username) {
      Alert.alert('Missing Username', 'Please enter a unique profile username (e.g. johndoe-corp)');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...profile,
        persona_type: selectedPersona,
        lead_capture_mode: profile.lead_capture_mode ? 1 : 0,
      };

      const res = await MobileApi.saveProfile(payload);
      if (res.data?.success) {
        Alert.alert(
          'Persona Saved! 🎉',
          `Your ${selectedPersona.toUpperCase()} digital business card & wallet pass have been updated.`
        );
        await refreshProfile();
      } else {
        Alert.alert('Save Failed', res.data?.msg || 'Could not save profile');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.msg || 'Profile update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Multi-Persona Digital Profiles</Text>
        <Text style={styles.subTitle}>
          Switch identities between Corporate, Freelance, and Personal cards with distinct links and QR codes.
        </Text>
      </View>

      {/* Persona Switcher Tabs */}
      <View style={styles.personaTabs}>
        <TouchableOpacity
          style={[styles.personaTab, selectedPersona === 'corporate' && styles.personaTabActive]}
          onPress={() => setSelectedPersona('corporate')}
        >
          <Building color={selectedPersona === 'corporate' ? '#3b82f6' : '#64748b'} size={16} />
          <Text style={[styles.personaTabText, selectedPersona === 'corporate' && styles.personaTabTextActive]}>
            Corporate
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.personaTab, selectedPersona === 'freelance' && styles.personaTabActive]}
          onPress={() => setSelectedPersona('freelance')}
        >
          <Code color={selectedPersona === 'freelance' ? '#10b981' : '#64748b'} size={16} />
          <Text style={[styles.personaTabText, selectedPersona === 'freelance' && styles.personaTabTextActive]}>
            Freelance
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.personaTab, selectedPersona === 'personal' && styles.personaTabActive]}
          onPress={() => setSelectedPersona('personal')}
        >
          <User color={selectedPersona === 'personal' ? '#a855f7' : '#64748b'} size={16} />
          <Text style={[styles.personaTabText, selectedPersona === 'personal' && styles.personaTabTextActive]}>
            Personal
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator color="#3b82f6" size="large" />
        </View>
      ) : (
        <View style={styles.card}>
          {/* Lead Capture Wall Feature Toggle */}
          <View style={styles.featureBox}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Lock color="#3b82f6" size={16} />
                <Text style={styles.featureTitle}>Lead Capture Wall Mode</Text>
              </View>
              <Text style={styles.featureDesc}>
                Visitors must submit reciprocal contact info before viewing full phone numbers and links.
              </Text>
            </View>
            <Switch
              value={profile.lead_capture_mode}
              onValueChange={(val) => setProfile({ ...profile, lead_capture_mode: val })}
              trackColor={{ false: '#334155', true: '#2563eb' }}
              thumbColor="#ffffff"
            />
          </View>

          <Text style={styles.label}>Profile Username (URL Handle)</Text>
          <View style={styles.inputRow}>
            <Globe color="#60a5fa" size={18} />
            <TextInput
              style={styles.input}
              value={profile.username}
              onChangeText={(t) => setProfile({ ...profile, username: t.toLowerCase() })}
              placeholder={selectedPersona === 'corporate' ? 'alex-enterprise' : 'alex-consulting'}
              placeholderTextColor="#64748b"
              autoCapitalize="none"
            />
          </View>
          <Text style={styles.helperText}>
            Public URL: http://localhost:3010/p/{profile.username || 'username'}
          </Text>

          <Text style={styles.label}>Full Display Name</Text>
          <View style={styles.inputRow}>
            <User color="#60a5fa" size={18} />
            <TextInput
              style={styles.input}
              value={profile.display_name}
              onChangeText={(t) => setProfile({ ...profile, display_name: t })}
              placeholder="Alexander Vance"
              placeholderTextColor="#64748b"
            />
          </View>

          <Text style={styles.label}>Title / Position</Text>
          <View style={styles.inputRow}>
            <Briefcase color="#38bdf8" size={18} />
            <TextInput
              style={styles.input}
              value={profile.title}
              onChangeText={(t) => setProfile({ ...profile, title: t })}
              placeholder="VP of Strategic Partnerships"
              placeholderTextColor="#64748b"
            />
          </View>

          <Text style={styles.label}>Company / Organization</Text>
          <View style={styles.inputRow}>
            <Building color="#f59e0b" size={18} />
            <TextInput
              style={styles.input}
              value={profile.company}
              onChangeText={(t) => setProfile({ ...profile, company: t })}
              placeholder="Apex Global Cloud"
              placeholderTextColor="#64748b"
            />
          </View>

          <Text style={styles.label}>WhatsApp / Phone</Text>
          <View style={styles.inputRow}>
            <Phone color="#10b981" size={18} />
            <TextInput
              style={styles.input}
              value={profile.whatsapp || profile.phone}
              onChangeText={(t) => setProfile({ ...profile, whatsapp: t, phone: t })}
              placeholder="+15550198834"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
            />
          </View>

          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputRow}>
            <Mail color="#a855f7" size={18} />
            <TextInput
              style={styles.input}
              value={profile.email}
              onChangeText={(t) => setProfile({ ...profile, email: t })}
              placeholder="alex.vance@enterprise.com"
              placeholderTextColor="#64748b"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.label}>Custom Domain (Optional)</Text>
          <View style={styles.inputRow}>
            <Globe color="#38bdf8" size={18} />
            <TextInput
              style={styles.input}
              value={profile.custom_domain}
              onChangeText={(t) => setProfile({ ...profile, custom_domain: t })}
              placeholder="cards.yourdomain.com"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.label}>Bio / Elevator Pitch</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={profile.bio}
            onChangeText={(t) => setProfile({ ...profile, bio: t })}
            placeholder="Specializing in multi-channel sales automation and high-velocity CRM growth."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Save color="#ffffff" size={20} />
                <Text style={styles.saveBtnText}>
                  Save {selectedPersona.toUpperCase()} Persona
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
    paddingBottom: 60,
  },
  centerContent: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
  },
  subTitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    lineHeight: 18,
  },
  personaTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  personaTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  personaTabActive: {
    backgroundColor: '#1e293b',
    borderColor: '#3b82f6',
  },
  personaTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  personaTabTextActive: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  featureBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b55',
    borderWidth: 1,
    borderColor: '#2563eb44',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#93c5fd',
  },
  featureDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 15,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
  },
  input: {
    flex: 1,
    color: '#f8fafc',
    paddingVertical: 12,
    fontSize: 14,
  },
  textArea: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: '#334155',
    textAlignVertical: 'top',
    height: 80,
  },
  helperText: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
