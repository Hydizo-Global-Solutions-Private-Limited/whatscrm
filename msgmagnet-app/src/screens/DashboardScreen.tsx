import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { MobileApi } from '../api/client';
import {
  Camera,
  Flame,
  CheckSquare,
  Users,
  Calendar,
  Share2,
  TrendingUp,
  MapPin,
  WifiOff,
  RefreshCw,
  Mic,
  Megaphone,
  BookOpen,
} from 'lucide-react-native';

export const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const { activeEventName, isOffline, pendingQueueCount, triggerSync } = useApp();
  const [stats, setStats] = useState({
    totalScans: 0,
    hotLeads: 0,
    pendingTasks: 0,
    cycleScans: 0,
    scansLimit: 500,
  });
  const [recentContacts, setRecentContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [fairRes, pipeRes, taskRes] = await Promise.allSettled([
        MobileApi.getFairUsage(),
        MobileApi.getPipelineBoard(),
        MobileApi.getTasks('pending'),
      ]);

      let totalScans = 0;
      let hotLeads = 0;
      let cycleScans = 0;
      let scansLimit = 500;

      if (fairRes.status === 'fulfilled' && fairRes.value.data?.success) {
        cycleScans = fairRes.value.data.usage?.card_scans?.used || 0;
        scansLimit = fairRes.value.data.usage?.card_scans?.limit || 500;
      }

      if (pipeRes.status === 'fulfilled' && pipeRes.value.data?.success) {
        const board = pipeRes.value.data.board || {};
        let allContacts: any[] = [];
        Object.values(board).forEach((stageList: any) => {
          if (Array.isArray(stageList)) {
            allContacts = allContacts.concat(stageList);
            stageList.forEach((c) => {
              if (c.lead_temperature === 'hot') hotLeads++;
            });
          }
        });
        totalScans = allContacts.length;
        setRecentContacts(allContacts.slice(0, 5));
      }

      let pendingTasks = 0;
      if (taskRes.status === 'fulfilled' && taskRes.value.data?.success) {
        pendingTasks = (taskRes.value.data.tasks || []).length;
      }

      setStats({
        totalScans,
        hotLeads,
        pendingTasks,
        cycleScans,
        scansLimit,
      });
    } catch (e) {
      console.warn('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  return (
    <View style={styles.container}>
      {/* Offline and Sync Indicator */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <WifiOff color="#f59e0b" size={16} />
          <Text style={styles.offlineText}>Offline Mode — Changes will sync automatically</Text>
        </View>
      )}

      {pendingQueueCount > 0 && !isOffline && (
        <TouchableOpacity style={styles.syncBanner} onPress={triggerSync}>
          <RefreshCw color="#3b82f6" size={16} />
          <Text style={styles.syncText}>{pendingQueueCount} offline actions pending — Tap to sync</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || user?.email?.split('@')[0] || 'Field Agent'}</Text>
          </View>
          <TouchableOpacity style={styles.eventBadge} onPress={() => navigation.navigate('Events')}>
            <Calendar color="#3b82f6" size={14} />
            <Text style={styles.eventText}>{activeEventName ? activeEventName : 'No Active Event'}</Text>
          </TouchableOpacity>
        </View>

        {/* Action Bar */}
        <View style={styles.quickActionBar}>
          <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => navigation.navigate('Scanner')}>
            <Camera color="#ffffff" size={20} />
            <Text style={styles.actionBtnPrimaryText}>Scan Card</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => navigation.navigate('Tasks')}>
            <CheckSquare color="#38bdf8" size={20} />
            <Text style={styles.actionBtnSecondaryText}>Tasks</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => navigation.navigate('MeetingVoice')}>
            <Mic color="#10b981" size={20} />
            <Text style={styles.actionBtnSecondaryText}>Meeting AI</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => navigation.navigate('ShareQR')}>
            <Share2 color="#a855f7" size={20} />
            <Text style={styles.actionBtnSecondaryText}>Share / NFC</Text>
          </TouchableOpacity>
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('CardsList')}>
            <View style={[styles.statIconBadge, { backgroundColor: '#1e3a8a' }]}>
              <Users color="#60a5fa" size={20} />
            </View>
            <Text style={styles.statNumber}>{stats.totalScans}</Text>
            <Text style={styles.statLabel}>Total Contacts</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('CardsList')}>
            <View style={[styles.statIconBadge, { backgroundColor: '#7f1d1d' }]}>
              <Flame color="#ef4444" size={20} />
            </View>
            <Text style={[styles.statNumber, { color: '#f87171' }]}>{stats.hotLeads}</Text>
            <Text style={styles.statLabel}>Hot Leads</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Scanner')}>
            <View style={[styles.statIconBadge, { backgroundColor: '#14532d' }]}>
              <TrendingUp color="#4ade80" size={20} />
            </View>
            <Text style={[styles.statNumber, { color: '#4ade80' }]}>
              {stats.cycleScans}/{stats.scansLimit}
            </Text>
            <Text style={styles.statLabel}>Cycle AI Scans</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Tasks')}>
            <View style={[styles.statIconBadge, { backgroundColor: '#581c87' }]}>
              <CheckSquare color="#c084fc" size={20} />
            </View>
            <Text style={[styles.statNumber, { color: '#c084fc' }]}>{stats.pendingTasks}</Text>
            <Text style={styles.statLabel}>Pending Tasks</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Nav Links */}
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navCard} onPress={() => navigation.navigate('Pipeline')}>
            <TrendingUp color="#3b82f6" size={24} />
            <Text style={styles.navCardTitle}>Sales Pipeline</Text>
            <Text style={styles.navCardSub}>7 Stage Kanban View</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navCard} onPress={() => navigation.navigate('NetworkMap')}>
            <MapPin color="#10b981" size={24} />
            <Text style={styles.navCardTitle}>Geo-Network</Text>
            <Text style={styles.navCardSub}>Map View with Pins</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navCard} onPress={() => navigation.navigate('CommunityFeed')}>
            <Megaphone color="#f59e0b" size={24} />
            <Text style={styles.navCardTitle}>B2B Community</Text>
            <Text style={styles.navCardSub}>Needs & Offers Feed</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navCard} onPress={() => navigation.navigate('TemplateVault')}>
            <BookOpen color="#a855f7" size={24} />
            <Text style={styles.navCardTitle}>Sales Script Vault</Text>
            <Text style={styles.navCardSub}>WA Conversion Scripts</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Captured Leads */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent AI Scanned Leads</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CardsList')}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#3b82f6" style={{ marginVertical: 20 }} />
        ) : recentContacts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Users color="#475569" size={32} />
            <Text style={styles.emptyText}>No contacts scanned yet</Text>
            <Text style={styles.emptySub}>Tap 'Scan Card' to capture your first business card.</Text>
          </View>
        ) : (
          recentContacts.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.contactItem}
              onPress={() => navigation.navigate('CardDetail', { contact: c })}
            >
              <View style={styles.contactAvatar}>
                <Text style={styles.contactAvatarText}>
                  {(c.name || 'U').substring(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{c.name || 'Unnamed Lead'}</Text>
                <Text style={styles.contactSub}>
                  {c.company ? `${c.company} • ` : ''}{c.job_title || c.mobile || 'No details'}
                </Text>
              </View>
              <View
                style={[
                  styles.tempBadge,
                  c.lead_temperature === 'hot'
                    ? styles.tempHot
                    : c.lead_temperature === 'warm'
                    ? styles.tempWarm
                    : styles.tempCold,
                ]}
              >
                <Text style={styles.tempBadgeText}>{(c.lead_temperature || 'warm').toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#451a03',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  offlineText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#172554',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  syncText: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  userName: {
    fontSize: 22,
    color: '#f8fafc',
    fontWeight: '800',
    marginTop: 2,
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  eventText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  quickActionBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionBtnPrimary: {
    flex: 2,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#2563eb',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  actionBtnSecondary: {
    flex: 1.2,
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionBtnSecondaryText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  statIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 2,
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  navCard: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  navCardTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  navCardSub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  seeAllText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#111827',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
  emptySub: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    color: '#93c5fd',
    fontSize: 15,
    fontWeight: '700',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  contactSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  tempBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tempHot: {
    backgroundColor: '#7f1d1d',
  },
  tempWarm: {
    backgroundColor: '#78350f',
  },
  tempCold: {
    backgroundColor: '#1e3a8a',
  },
  tempBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
});
