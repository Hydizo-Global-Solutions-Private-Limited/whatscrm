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
import { MobileApi } from '../api/client';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  MapPin,
  Users,
  Plus,
  Check,
  Download,
  X,
  Radio,
} from 'lucide-react-native';

export const EventsScreen = () => {
  const { activeEventId, setActiveEvent } = useApp();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Event Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDate, setEventDate] = useState('');

  const fetchEvents = useCallback(async () => {
    try {
      const res = await MobileApi.getEvents();
      if (res.data?.success) {
        setEvents(res.data.events || []);
      }
    } catch (e) {
      console.warn('Error fetching events:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSelectEvent = (event: any) => {
    if (activeEventId === event.id) {
      setActiveEvent(null, null);
      Alert.alert('Event Deselected', 'Subsequent card scans will not have an event tag.');
    } else {
      setActiveEvent(event.id, event.name);
      Alert.alert('Active Event Set', `All new card scans will now be tagged under "${event.name}".`);
    }
  };

  const handleCreateEvent = async () => {
    if (!eventName.trim()) {
      Alert.alert('Error', 'Please provide an event name');
      return;
    }
    try {
      await MobileApi.createEvent({
        name: eventName,
        location: eventLocation,
        start_date: eventDate || undefined,
      });
      setEventName('');
      setEventLocation('');
      setEventDate('');
      setModalVisible(false);
      fetchEvents();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not create event');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Event Workspaces</Text>
          <Text style={styles.subTitle}>Tag and organize leads by conference or expo</Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Plus color="#ffffff" size={18} />
        </TouchableOpacity>
      </View>

      {/* Events List */}
      {loading ? (
        <ActivityIndicator color="#3b82f6" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {events.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Calendar color="#475569" size={36} />
              <Text style={styles.emptyTitle}>No Events Created</Text>
              <Text style={styles.emptySub}>Create your first event workspace to group scanned leads.</Text>
            </View>
          ) : (
            events.map((e) => {
              const isActive = activeEventId === e.id;
              return (
                <View
                  key={e.id}
                  style={[styles.eventCard, isActive && styles.eventCardActive]}
                >
                  <View style={styles.eventHeader}>
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventName}>{e.name}</Text>
                      {e.location && (
                        <View style={styles.iconRow}>
                          <MapPin color="#64748b" size={12} />
                          <Text style={styles.iconText}>{e.location}</Text>
                        </View>
                      )}
                      {e.start_date && (
                        <View style={styles.iconRow}>
                          <Calendar color="#64748b" size={12} />
                          <Text style={styles.iconText}>
                            {new Date(e.start_date).toLocaleDateString()}
                          </Text>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      style={[styles.selectBtn, isActive && styles.selectBtnActive]}
                      onPress={() => handleSelectEvent(e)}
                    >
                      {isActive ? (
                        <>
                          <Check color="#ffffff" size={14} />
                          <Text style={styles.selectBtnTextActive}>Active</Text>
                        </>
                      ) : (
                        <Text style={styles.selectBtnText}>Set Active</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.eventFooter}>
                    <View style={styles.leadCountBadge}>
                      <Users color="#60a5fa" size={12} />
                      <Text style={styles.leadCountText}>{e.lead_count || 0} Scanned Leads</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.exportBtn}
                      onPress={() => Alert.alert('Export Ready', `CSV export ready for ${e.name}`)}
                    >
                      <Download color="#94a3b8" size={14} />
                      <Text style={styles.exportBtnText}>Export CSV</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Create Event Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Event Workspace</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color="#94a3b8" size={22} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Event Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., TechCrunch Disrupt 2026"
              placeholderTextColor="#64748b"
              value={eventName}
              onChangeText={setEventName}
            />

            <Text style={styles.inputLabel}>Location / Venue</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Moscone Center, San Francisco"
              placeholderTextColor="#64748b"
              value={eventLocation}
              onChangeText={setEventLocation}
            />

            <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="2026-10-15"
              placeholderTextColor="#64748b"
              value={eventDate}
              onChangeText={setEventDate}
            />

            <TouchableOpacity style={styles.saveEventBtn} onPress={handleCreateEvent}>
              <Text style={styles.saveEventBtnText}>Create Workspace</Text>
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
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  subTitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  eventCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  eventCardActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#0f172a',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  iconText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  selectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  selectBtnActive: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectBtnText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  selectBtnTextActive: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  leadCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  leadCountText: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '600',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exportBtnText: {
    color: '#94a3b8',
    fontSize: 12,
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
    marginBottom: 14,
  },
  saveEventBtn: {
    backgroundColor: '#2563eb',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  saveEventBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
