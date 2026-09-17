import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  TextInput,
} from 'react-native';
import { MobileApi } from '../api/client';
import {
  MessageCircle,
  Phone,
  Mail,
  Building,
  Briefcase,
  MapPin,
  Calendar,
  FileText,
  Check,
  Flame,
  Zap,
  Snowflake,
} from 'lucide-react-native';

const STAGES = [
  'new_scanned',
  'contacted',
  'meeting_set',
  'proposal_sent',
  'won',
  'lost',
  'follow_up_later',
];

export const CardDetailScreen = ({ route, navigation }: any) => {
  const { contact: initialContact } = route.params;
  const [contact, setContact] = useState(initialContact);
  const [stage, setStage] = useState(contact.pipeline_stage || 'new_scanned');
  const [temperature, setTemperature] = useState<'hot' | 'warm' | 'cold'>(
    contact.lead_temperature || 'warm'
  );
  const [notes, setNotes] = useState(contact.notes || '');
  const [updating, setUpdating] = useState(false);

  const handleStageChange = async (newStage: string) => {
    setStage(newStage);
    try {
      await MobileApi.movePipelineStage(contact.id, newStage);
    } catch {
      Alert.alert('Update Error', 'Could not update pipeline stage');
    }
  };

  const handleTemperatureChange = async (newTemp: 'hot' | 'warm' | 'cold') => {
    setTemperature(newTemp);
    try {
      await MobileApi.setLeadTemperature(contact.id, newTemp);
    } catch {
      Alert.alert('Update Error', 'Could not update lead warmth');
    }
  };

  const openWhatsApp = () => {
    if (!contact.mobile) {
      Alert.alert('No Mobile', 'No phone number for this contact');
      return;
    }
    const cleanPhone = contact.mobile.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`Hi ${contact.name || ''}, connecting from MsgMagnet!`);
    Linking.openURL(`whatsapp://send?phone=${cleanPhone}&text=${text}`).catch(() =>
      Linking.openURL(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`)
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Profile Section */}
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(contact.name || 'U').substring(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{contact.name || 'Unnamed Lead'}</Text>
        <Text style={styles.subTitle}>
          {contact.company ? `${contact.company} • ` : ''}
          {contact.job_title || 'Lead Contact'}
        </Text>

        {/* Temperature Controls */}
        <View style={styles.tempSelector}>
          {(['hot', 'warm', 'cold'] as const).map((temp) => (
            <TouchableOpacity
              key={temp}
              style={[styles.tempBtn, temperature === temp && styles.tempBtnActive]}
              onPress={() => handleTemperatureChange(temp)}
            >
              {temp === 'hot' ? (
                <Flame color={temperature === temp ? '#ffffff' : '#ef4444'} size={14} />
              ) : temp === 'warm' ? (
                <Zap color={temperature === temp ? '#ffffff' : '#f59e0b'} size={14} />
              ) : (
                <Snowflake color={temperature === temp ? '#ffffff' : '#60a5fa'} size={14} />
              )}
              <Text style={[styles.tempBtnText, temperature === temp && styles.tempBtnTextActive]}>
                {temp.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Action Icons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#14532d' }]} onPress={openWhatsApp}>
            <MessageCircle color="#4ade80" size={18} />
            <Text style={styles.actionBtnText}>WhatsApp</Text>
          </TouchableOpacity>

          {contact.mobile && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#1e3a8a' }]}
              onPress={() => Linking.openURL(`tel:${contact.mobile}`)}
            >
              <Phone color="#60a5fa" size={18} />
              <Text style={styles.actionBtnText}>Call</Text>
            </TouchableOpacity>
          )}

          {contact.email && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#581c87' }]}
              onPress={() => Linking.openURL(`mailto:${contact.email}`)}
            >
              <Mail color="#c084fc" size={18} />
              <Text style={styles.actionBtnText}>Email</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Pipeline Stage Selector */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Pipeline Stage</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stageScroll}>
          {STAGES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.stageChip, stage === s && styles.stageChipActive]}
              onPress={() => handleStageChange(s)}
            >
              {stage === s && <Check color="#ffffff" size={14} style={{ marginRight: 4 }} />}
              <Text style={[styles.stageChipText, stage === s && styles.stageChipTextActive]}>
                {s.replace(/_/g, ' ').toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Detailed Info */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Contact Dossier</Text>

        <View style={styles.infoRow}>
          <Phone color="#64748b" size={18} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{contact.mobile || 'None provided'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Mail color="#64748b" size={18} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{contact.email || 'None provided'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Building color="#64748b" size={18} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Company</Text>
            <Text style={styles.infoValue}>{contact.company || 'None provided'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Briefcase color="#64748b" size={18} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Job Title</Text>
            <Text style={styles.infoValue}>{contact.job_title || 'None provided'}</Text>
          </View>
        </View>

        {contact.address && (
          <View style={styles.infoRow}>
            <MapPin color="#64748b" size={18} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{contact.address}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Notes Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Notes & Follow-Up Context</Text>
        <TextInput
          style={styles.notesInput}
          multiline
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add conversation notes, deal details..."
          placeholderTextColor="#64748b"
        />
      </View>
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
  headerCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#3b82f6',
    fontSize: 24,
    fontWeight: '800',
  },
  name: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  subTitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
  },
  tempSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  tempBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#0b0f19',
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tempBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  tempBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  tempBtnTextActive: {
    color: '#ffffff',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  stageScroll: {
    flexDirection: 'row',
  },
  stageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0b0f19',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stageChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  stageChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  stageChipTextActive: {
    color: '#ffffff',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  infoValue: {
    color: '#f8fafc',
    fontSize: 14,
    marginTop: 2,
  },
  notesInput: {
    backgroundColor: '#0b0f19',
    borderRadius: 12,
    padding: 12,
    color: '#ffffff',
    fontSize: 14,
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#334155',
    textAlignVertical: 'top',
  },
});
