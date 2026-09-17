import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { MobileApi } from '../api/client';
import {
  Mic,
  Square,
  Sparkles,
  ShieldCheck,
  Cloud,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Clock,
  ArrowRight,
} from 'lucide-react-native';

export const MeetingVoiceScreen = ({ navigation }: any) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [meetingTitle, setMeetingTitle] = useState('Enterprise WhatsApp CRM Strategy Review');
  const [attendeeName, setAttendeeName] = useState('David Miller (CTO)');
  const [engineMode, setEngineMode] = useState<'local' | 'cloud'>('local');
  const [analyzing, setAnalyzing] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  // Timer interval reference
  const timerRef = React.useRef<any>(null);

  const startRecording = () => {
    setIsRecording(true);
    setRecordSeconds(0);
    setSummaryData(null);
    timerRef.current = setInterval(() => {
      setRecordSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopAndProcess = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setAnalyzing(true);

    try {
      // Mock or recorded base64 payload
      const mockBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

      const res = await MobileApi.summarizeMeeting({
        audioBase64: mockBase64,
        mimeType: 'audio/wav',
        mode: engineMode,
        meetingTitle,
        attendeeName,
      });

      if (res.data?.success) {
        setSummaryData(res.data.summary);
        Alert.alert('Meeting Summarized! 🎯', 'Minutes, tasks, and follow-ups extracted and synced into your CRM.');
      } else {
        Alert.alert('Processing Error', res.data?.msg || 'Could not process audio.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.msg || err.message || 'Voice summarizer failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.tag}>
          <Sparkles color="#3b82f6" size={14} />
          <Text style={styles.tagText}>Full Meeting Voice Summarizer</Text>
        </View>
        <Text style={styles.title}>In-Person Meeting Debrief</Text>
        <Text style={styles.subTitle}>
          Record your in-person or client call. Automatically extract executive minutes, CRM action items, and WhatsApp follow-up messages.
        </Text>
      </View>

      {/* Engine Selection Toggle */}
      <View style={styles.engineCard}>
        <Text style={styles.engineLabel}>AI Processing Engine</Text>
        <View style={styles.engineToggleRow}>
          <TouchableOpacity
            style={[styles.engineOption, engineMode === 'local' && styles.engineActiveLocal]}
            onPress={() => setEngineMode('local')}
          >
            <ShieldCheck color={engineMode === 'local' ? '#10b981' : '#64748b'} size={18} />
            <View style={{ marginLeft: 8 }}>
              <Text style={[styles.engineOptionTitle, engineMode === 'local' && styles.textActive]}>
                Local Zero-Cost
              </Text>
              <Text style={styles.engineOptionSub}>100% Privacy &bull; Zero API Keys</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.engineOption, engineMode === 'cloud' && styles.engineActiveCloud]}
            onPress={() => setEngineMode('cloud')}
          >
            <Cloud color={engineMode === 'cloud' ? '#3b82f6' : '#64748b'} size={18} />
            <View style={{ marginLeft: 8 }}>
              <Text style={[styles.engineOptionTitle, engineMode === 'cloud' && styles.textActive]}>
                Gemini 1.5 Pro
              </Text>
              <Text style={styles.engineOptionSub}>Multimodal Audio AI</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Metadata Inputs */}
      <View style={styles.metaCard}>
        <Text style={styles.metaLabel}>Meeting Topic / Objective</Text>
        <TextInput
          style={styles.metaInput}
          value={meetingTitle}
          onChangeText={setMeetingTitle}
          placeholder="e.g. Enterprise Onboarding & Contract Negotiation"
          placeholderTextColor="#64748b"
        />

        <Text style={[styles.metaLabel, { marginTop: 12 }]}>Key Client / Attendee</Text>
        <TextInput
          style={styles.metaInput}
          value={attendeeName}
          onChangeText={setAttendeeName}
          placeholder="e.g. David Miller (VP Operations)"
          placeholderTextColor="#64748b"
        />
      </View>

      {/* Recording Interface */}
      <View style={styles.recorderCard}>
        <View style={styles.pulseIndicator}>
          {isRecording ? (
            <View style={styles.recordingPulse}>
              <View style={styles.pulseInner} />
            </View>
          ) : (
            <View style={styles.idlePulse}>
              <Mic color="#94a3b8" size={32} />
            </View>
          )}
        </View>

        <Text style={styles.timerText}>{formatTime(recordSeconds)}</Text>
        <Text style={styles.statusText}>
          {isRecording
            ? 'Listening & capturing discussion points...'
            : analyzing
            ? 'AI Engine analyzing speech patterns & action items...'
            : 'Tap button below to start debrief'}
        </Text>

        {analyzing ? (
          <ActivityIndicator color="#3b82f6" size="large" style={{ marginTop: 20 }} />
        ) : isRecording ? (
          <TouchableOpacity style={styles.stopBtn} onPress={stopAndProcess}>
            <Square color="#ffffff" size={20} fill="#ffffff" />
            <Text style={styles.stopBtnText}>Stop & Extract Minutes</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.startBtn} onPress={startRecording}>
            <Mic color="#ffffff" size={20} />
            <Text style={styles.startBtnText}>Start Meeting Recording</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Summary Output */}
      {summaryData && (
        <View style={styles.resultsContainer}>
          <View style={styles.resultSection}>
            <Text style={styles.sectionHeader}>📋 Executive Summary</Text>
            {summaryData.executive_summary?.map((bullet: string, idx: number) => (
              <View key={idx} style={styles.bulletRow}>
                <CheckCircle2 color="#10b981" size={16} style={{ marginTop: 2 }} />
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>

          <View style={styles.resultSection}>
            <Text style={styles.sectionHeader}>⚡ Action Items & CRM Tasks (Auto-Synced)</Text>
            {summaryData.action_items?.map((item: any, idx: number) => (
              <View key={idx} style={styles.actionItemCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTask}>{item.task}</Text>
                  <View style={styles.actionMetaRow}>
                    <Clock color="#64748b" size={12} />
                    <Text style={styles.actionMetaText}>Due: {item.due || '2 days'}</Text>
                    <Text style={styles.priorityBadge}>{item.priority?.toUpperCase() || 'HIGH'}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.resultSection}>
            <Text style={styles.sectionHeader}>💬 Ready-to-Send WhatsApp Follow-up</Text>
            <View style={styles.waPreviewBox}>
              <Text style={styles.waPreviewText}>{summaryData.draft_followup_whatsapp}</Text>
              <TouchableOpacity
                style={styles.sendWaBtn}
                onPress={() => {
                  const encoded = encodeURIComponent(summaryData.draft_followup_whatsapp);
                  Linking.openURL(`whatsapp://send?text=${encoded}`);
                }}
              >
                <MessageSquare color="#ffffff" size={16} />
                <Text style={styles.sendWaBtnText}>Open in WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  header: {
    marginBottom: 16,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  tagText: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '600',
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
  engineCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  engineLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  engineToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  engineOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b55',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1e293b',
  },
  engineActiveLocal: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b33',
  },
  engineActiveCloud: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a8a33',
  },
  engineOptionTitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  engineOptionSub: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  textActive: {
    color: '#f8fafc',
  },
  metaCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  metaLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  metaInput: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  recorderCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 20,
  },
  pulseIndicator: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  idlePulse: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingPulse: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#ef444433',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ef4444',
  },
  timerText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f8fafc',
    fontVariant: ['tabular-nums'],
  },
  statusText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 6,
    textAlign: 'center',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20,
  },
  stopBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  resultsContainer: {
    gap: 16,
  },
  resultSection: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  actionItemCard: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  actionTask: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8fafc',
  },
  actionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  actionMetaText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  priorityBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ef4444',
    backgroundColor: '#ef444422',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  waPreviewBox: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
  },
  waPreviewText: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 19,
    fontStyle: 'italic',
  },
  sendWaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#25D366',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 12,
  },
  sendWaBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
