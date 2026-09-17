import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Linking,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MobileApi } from '../api/client';
import { cacheContacts, getCachedContacts } from '../database/offlineDb';
import { useApp } from '../context/AppContext';
import {
  Search,
  MessageCircle,
  Phone,
  Mail,
  Flame,
  Zap,
  Snowflake,
  Filter,
} from 'lucide-react-native';

export const CardsListScreen = ({ navigation }: any) => {
  const { isOffline } = useApp();
  const [contacts, setContacts] = useState<any[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'hot' | 'warm' | 'cold'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      if (isOffline) {
        const cached = await getCachedContacts();
        setContacts(cached);
        return;
      }

      const res = await MobileApi.getContacts();
      if (res.data?.success) {
        const list = res.data.contacts || [];
        setContacts(list);
        await cacheContacts(list);
      }
    } catch (e) {
      console.warn('Error fetching contacts, loading offline cache:', e);
      const cached = await getCachedContacts();
      setContacts(cached);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isOffline]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    let result = contacts;
    if (activeFilter !== 'all') {
      result = result.filter((c) => c.lead_temperature === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.job_title?.toLowerCase().includes(q) ||
          c.mobile?.includes(q) ||
          c.email?.toLowerCase().includes(q)
      );
    }
    setFilteredContacts(result);
  }, [searchQuery, activeFilter, contacts]);

  const openWhatsApp = (phone: string, name: string) => {
    if (!phone) {
      Alert.alert('No Mobile Number', 'This contact does not have a phone number.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`Hi ${name || 'there'}, great connecting with you via MsgMagnet!`);
    const url = `whatsapp://send?phone=${cleanPhone}&text=${text}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`);
        }
      })
      .catch(() => Alert.alert('Error', 'Could not open WhatsApp'));
  };

  const makeCall = (phone: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Could not make call'));
  };

  const sendEmail = (email: string) => {
    if (!email) return;
    Linking.openURL(`mailto:${email}`).catch(() => Alert.alert('Error', 'Could not open email client'));
  };

  const renderContactItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.contactCard}
      onPress={() => navigation.navigate('CardDetail', { contact: item })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(item.name || 'U').substring(0, 2).toUpperCase()}</Text>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.name}>{item.name || 'Unnamed Lead'}</Text>
          <Text style={styles.jobTitle}>
            {item.company ? `${item.company} • ` : ''}
            {item.job_title || 'Lead'}
          </Text>
        </View>

        <View
          style={[
            styles.tempBadge,
            item.lead_temperature === 'hot'
              ? styles.tempHot
              : item.lead_temperature === 'warm'
              ? styles.tempWarm
              : styles.tempCold,
          ]}
        >
          {item.lead_temperature === 'hot' ? (
            <Flame color="#ef4444" size={12} />
          ) : item.lead_temperature === 'warm' ? (
            <Zap color="#f59e0b" size={12} />
          ) : (
            <Snowflake color="#60a5fa" size={12} />
          )}
          <Text style={styles.tempBadgeText}>{(item.lead_temperature || 'warm').toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.stagePill}>
          <Text style={styles.stageText}>
            {(item.pipeline_stage || 'new_scanned').replace('_', ' ').toUpperCase()}
          </Text>
        </View>

        <View style={styles.quickActionIcons}>
          {item.mobile ? (
            <>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: '#14532d' }]}
                onPress={() => openWhatsApp(item.mobile, item.name)}
              >
                <MessageCircle color="#4ade80" size={16} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: '#1e3a8a' }]}
                onPress={() => makeCall(item.mobile)}
              >
                <Phone color="#60a5fa" size={16} />
              </TouchableOpacity>
            </>
          ) : null}

          {item.email ? (
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: '#581c87' }]}
              onPress={() => sendEmail(item.email)}
            >
              <Mail color="#c084fc" size={16} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search color="#64748b" size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, company, phone..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {(['all', 'hot', 'warm', 'cold'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterChip, activeFilter === tab && styles.filterChipActive]}
              onPress={() => setActiveFilter(tab)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === tab && styles.filterChipTextActive,
                ]}
              >
                {tab === 'all'
                  ? 'All Leads'
                  : tab === 'hot'
                  ? '🔥 Hot'
                  : tab === 'warm'
                  ? '⚡ Warm'
                  : '❄️ Cold'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#3b82f6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderContactItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchContacts();
              }}
              tintColor="#3b82f6"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Contacts Found</Text>
              <Text style={styles.emptySub}>
                {searchQuery ? 'Try changing your search term.' : 'Scan cards to start populating your CRM.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  searchSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    height: 44,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  filterChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  contactCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#93c5fd',
    fontSize: 16,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  jobTitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  tempBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
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
  tempBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  stagePill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stageText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  quickActionIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
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
});
