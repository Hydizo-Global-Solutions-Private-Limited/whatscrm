import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Audio } from 'expo-av';
import { MobileApi } from '../api/client';
import {
  Mic,
  Square,
  CheckSquare,
  Square as UncheckedSquare,
  Plus,
  Clock,
  Sparkles,
  Calendar,
  X,
} from 'lucide-react-native';

export const TasksScreen = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [loading, setLoading] = useState(true);

  // Manual creation state
  const [modalVisible, setModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  // Voice recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [processingVoice, setProcessingVoice] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await MobileApi.getTasks(activeTab);
      if (res.data?.success) {
        setTasks(res.data.tasks || []);
      }
    } catch (e) {
      console.warn('Error fetching tasks:', e);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const toggleTask = async (task: any) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    try {
      await MobileApi.updateTask(task.id, { status: nextStatus });
    } catch {
      Alert.alert('Error', 'Could not update task');
      fetchTasks();
    }
  };

  const handleManualCreate = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      await MobileApi.createTask({
        title: newTaskTitle,
        due_date: newTaskDueDate || undefined,
        priority: 'medium',
      });
      setNewTaskTitle('');
      setNewTaskDueDate('');
      setModalVisible(false);
      fetchTasks();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not create task');
    }
  };

  // Voice Recording handlers
  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Denied', 'Microphone permission is required for voice tasks.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRec);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Recording Error', 'Could not start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
      setProcessingVoice(true);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        Alert.alert('Error', 'No recording file captured');
        setProcessingVoice(false);
        return;
      }

      // Convert local file to base64
      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        try {
          const res = await MobileApi.voiceToTask(base64Audio, 'audio/m4a');
          if (res.data?.success) {
            Alert.alert(
              'Voice Task Created! ✨',
              `Gemini parsed:\n"${res.data.task?.title || res.data.intent?.title}"`
            );
            fetchTasks();
          } else {
            Alert.alert('Voice AI Error', res.data?.msg || 'Could not parse voice note');
          }
        } catch (err: any) {
          Alert.alert('Error', err.response?.data?.msg || 'Voice note processing failed');
        } finally {
          setProcessingVoice(false);
          setRecording(null);
        }
      };

      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Failed to stop recording', err);
      setProcessingVoice(false);
      setRecording(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header & Filter Tabs */}
      <View style={styles.header}>
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'pending' && styles.tabBtnTextActive]}>
              Pending
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'completed' && styles.tabBtnActive]}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'completed' && styles.tabBtnTextActive]}>
              Completed
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addTaskBtn} onPress={() => setModalVisible(true)}>
          <Plus color="#ffffff" size={18} />
        </TouchableOpacity>
      </View>

      {/* Voice CRM Floating Action Section */}
      <View style={styles.voiceSection}>
        <View style={styles.voiceCard}>
          <View style={styles.voiceInfo}>
            <View style={styles.aiBadge}>
              <Sparkles color="#3b82f6" size={14} />
              <Text style={styles.aiBadgeText}>Voice-to-CRM AI</Text>
            </View>
            <Text style={styles.voiceTitle}>
              {isRecording
                ? 'Recording... Tap again to stop'
                : processingVoice
                ? 'Gemini parsing voice note...'
                : 'Tap to speak your task'}
            </Text>
            <Text style={styles.voiceSub}>
              "Remind me to follow up with John tomorrow at 3pm"
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.micButton,
              isRecording && styles.micButtonRecording,
              processingVoice && styles.micButtonDisabled,
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={processingVoice}
          >
            {processingVoice ? (
              <ActivityIndicator color="#ffffff" />
            ) : isRecording ? (
              <Square color="#ffffff" size={22} />
            ) : (
              <Mic color="#ffffff" size={24} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Tasks List */}
      {loading ? (
        <ActivityIndicator color="#3b82f6" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {tasks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <CheckSquare color="#475569" size={36} />
              <Text style={styles.emptyTitle}>No {activeTab} tasks</Text>
              <Text style={styles.emptySub}>
                Use the mic button or '+' to record your action items.
              </Text>
            </View>
          ) : (
            tasks.map((t) => (
              <View key={t.id} style={styles.taskCard}>
                <TouchableOpacity style={styles.checkbox} onPress={() => toggleTask(t)}>
                  {t.status === 'completed' ? (
                    <CheckSquare color="#10b981" size={22} />
                  ) : (
                    <UncheckedSquare color="#64748b" size={22} />
                  )}
                </TouchableOpacity>

                <View style={styles.taskInfo}>
                  <Text
                    style={[
                      styles.taskTitle,
                      t.status === 'completed' && styles.taskTitleCompleted,
                    ]}
                  >
                    {t.title}
                  </Text>
                  {t.due_date && (
                    <View style={styles.dueRow}>
                      <Clock color="#94a3b8" size={12} />
                      <Text style={styles.dueText}>
                        {new Date(t.due_date).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>

                {t.source === 'voice' && (
                  <View style={styles.voiceBadge}>
                    <Mic color="#c084fc" size={12} />
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Manual Task Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Task</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color="#94a3b8" size={22} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Task Description</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Send pricing proposal to Acme Corp"
              placeholderTextColor="#64748b"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />

            <Text style={styles.inputLabel}>Due Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="2026-09-15"
              placeholderTextColor="#64748b"
              value={newTaskDueDate}
              onChangeText={setNewTaskDueDate}
            />

            <TouchableOpacity style={styles.saveTaskBtn} onPress={handleManualCreate}>
              <Text style={styles.saveTaskBtnText}>Create Task</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#111827',
  },
  tabBtnActive: {
    backgroundColor: '#2563eb',
  },
  tabBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  addTaskBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceSection: {
    padding: 16,
    paddingBottom: 8,
  },
  voiceCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  voiceInfo: {
    flex: 1,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  aiBadgeText: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  voiceTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  voiceSub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
  micButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#2563eb',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  micButtonRecording: {
    backgroundColor: '#ef4444',
  },
  micButtonDisabled: {
    opacity: 0.6,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  checkbox: {
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  taskTitleCompleted: {
    color: '#64748b',
    textDecorationLine: 'line-through',
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dueText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  voiceBadge: {
    padding: 6,
    backgroundColor: '#3b0764',
    borderRadius: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#0b0f19',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  saveTaskBtn: {
    backgroundColor: '#2563eb',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveTaskBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
