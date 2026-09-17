import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { MobileApi } from '../api/client';
import { useApp } from '../context/AppContext';
import { enqueueAction } from '../database/offlineDb';
import {
  ArrowRight,
  Flame,
  Zap,
  Snowflake,
  MessageCircle,
} from 'lucide-react-native';

const STAGES = [
  { key: 'new_scanned', label: 'New Scanned', color: '#3b82f6' },
  { key: 'contacted', label: 'Contacted', color: '#8b5cf6' },
  { key: 'meeting_set', label: 'Meeting Set', color: '#f59e0b' },
  { key: 'proposal_sent', label: 'Proposal Sent', color: '#ec4899' },
  { key: 'won', label: 'Won / Closed', color: '#10b981' },
  { key: 'lost', label: 'Lost', color: '#ef4444' },
  { key: 'follow_up_later', label: 'Follow Up', color: '#64748b' },
];

export const LeadsPipelineScreen = ({ navigation }: any) => {
  const { isOffline } = useApp();
  const [board, setBoard] = useState<{ [key: string]: any[] }>({});
  const [activeStageKey, setActiveStageKey] = useState<string>('new_scanned');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await MobileApi.getPipelineBoard();
      if (res.data?.success) {
        setBoard(res.data.board || {});
      }
    } catch (e) {
      console.warn('Error loading pipeline board:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const advanceStage = async (contact: any) => {
    const currentIndex = STAGES.findIndex((s) => s.key === (contact.pipeline_stage || 'new_scanned'));
    if (currentIndex >= STAGES.length - 1) return;

    const nextStage = STAGES[currentIndex + 1].key;

    // Optimistic UI update
    setBoard((prev) => {
      const currentList = prev[contact.pipeline_stage || 'new_scanned'] || [];
      const nextList = prev[nextStage] || [];
      return {
        ...prev,
        [contact.pipeline_stage || 'new_scanned']: currentList.filter((c) => c.id !== contact.id),
        [nextStage]: [{ ...contact, pipeline_stage: nextStage }, ...nextList],
      };
    });

    try {
      if (isOffline) {
        await enqueueAction('pipeline', { contact_id: contact.id, stage: nextStage });
      } else {
        await MobileApi.movePipelineStage(contact.id, nextStage);
      }
    } catch {
      Alert.alert('Update Failed', 'Could not advance lead stage');
      fetchBoard();
    }
  };

  const activeStageObj = STAGES.find((s) => s.key === activeStageKey) || STAGES[0];
  const currentLeads = board[activeStageKey] || [];

  return (
    <View style={styles.container}>
      {/* Horizontal Stage Navigation Tabs */}
      <View style={styles.stageTabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stageTabsContent}>
          {STAGES.map((s) => {
            const count = (board[s.key] || []).length;
            const isSelected = activeStageKey === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[
                  styles.stageTab,
                  isSelected && { borderBottomColor: s.color, borderBottomWidth: 3 },
                ]}
                onPress={() => setActiveStageKey(s.key)}
              >
                <Text style={[styles.stageTabText, isSelected && { color: '#ffffff' }]}>
                  {s.label}
                </Text>
                <View style={[styles.countBadge, { backgroundColor: isSelected ? s.color : '#1e293b' }]}>
                  <Text style={styles.countText}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Stage Header Summary */}
      <View style={styles.summaryBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.stageIndicatorDot, { backgroundColor: activeStageObj.color }]} />
          <Text style={styles.summaryTitle}>{activeStageObj.label}</Text>
        </View>
        <Text style={styles.summaryCount}>{currentLeads.length} Leads</Text>
      </View>

      {/* Leads Column Content */}
      {loading ? (
        <ActivityIndicator color="#3b82f6" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          style={styles.leadsList}
          contentContainerStyle={styles.leadsListContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchBoard();
              }}
              tintColor="#3b82f6"
            />
          }
        >
          {currentLeads.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No leads in {activeStageObj.label}</Text>
              <Text style={styles.emptySub}>Advance leads from previous stages or scan new cards.</Text>
            </View>
          ) : (
            currentLeads.map((contact) => (
              <TouchableOpacity
                key={contact.id}
                style={styles.leadCard}
                onPress={() => navigation.navigate('CardDetail', { contact })}
              >
                <View style={styles.leadHeader}>
                  <View style={styles.leadAvatar}>
                    <Text style={styles.leadAvatarText}>
                      {(contact.name || 'U').substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.leadMeta}>
                    <Text style={styles.leadName}>{contact.name || 'Unnamed Lead'}</Text>
                    <Text style={styles.leadCompany}>
                      {contact.company ? `${contact.company} • ` : ''}
                      {contact.job_title || 'Lead'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.tempIconBadge,
                      contact.lead_temperature === 'hot'
                        ? styles.tempHot
                        : contact.lead_temperature === 'warm'
                        ? styles.tempWarm
                        : styles.tempCold,
                    ]}
                  >
                    {contact.lead_temperature === 'hot' ? (
                      <Flame color="#ef4444" size={14} />
                    ) : contact.lead_temperature === 'warm' ? (
                      <Zap color="#f59e0b" size={14} />
                    ) : (
                      <Snowflake color="#60a5fa" size={14} />
                    )}
                  </View>
                </View>

                {contact.notes ? (
                  <Text style={styles.leadNotes} numberOfLines={2}>
                    {contact.notes}
                  </Text>
                ) : null}

                <View style={styles.leadFooter}>
                  <Text style={styles.timeText}>
                    {contact.mobile || 'No Phone'}
                  </Text>

                  <TouchableOpacity
                    style={styles.advanceBtn}
                    onPress={() => advanceStage(contact)}
                  >
                    <Text style={styles.advanceBtnText}>Advance</Text>
                    <ArrowRight color="#3b82f6" size={14} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  stageTabsWrapper: {
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  stageTabsContent: {
    paddingHorizontal: 12,
  },
  stageTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 8,
  },
  stageTabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  stageIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  summaryTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  summaryCount: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  leadsList: {
    flex: 1,
  },
  leadsListContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  leadCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  leadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leadAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  leadAvatarText: {
    color: '#93c5fd',
    fontSize: 14,
    fontWeight: '700',
  },
  leadMeta: {
    flex: 1,
  },
  leadName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  leadCompany: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  tempIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tempHot: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  tempWarm: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  tempCold: {
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
  },
  leadNotes: {
    color: '#cbd5e1',
    fontSize: 12,
    backgroundColor: '#0b0f19',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  leadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  timeText: {
    color: '#64748b',
    fontSize: 12,
  },
  advanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  advanceBtnText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '700',
  },
});
