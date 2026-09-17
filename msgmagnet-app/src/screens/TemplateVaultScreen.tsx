import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Linking,
  ScrollView,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MobileApi } from '../api/client';
import {
  BookOpen,
  Copy,
  Check,
  Share2,
  MessageSquare,
  Search,
  Tag,
} from 'lucide-react-native';

const INDUSTRIES = [
  { id: 'all', label: 'All Industries' },
  { id: 'B2B Services', label: '💼 B2B Services' },
  { id: 'Real Estate', label: '🏢 Real Estate' },
  { id: 'D2C', label: '📦 D2C Brands' },
  { id: 'Consulting', label: '⚖️ Consulting' },
  { id: 'Manufacturing', label: '🏭 Manufacturing' },
];

export const TemplateVaultScreen = ({ navigation }: any) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const params: any = {};
      if (selectedIndustry !== 'all') {
        params.industry = selectedIndustry;
      }
      const res = await MobileApi.getSalesTemplates(params);
      if (res.data?.success && Array.isArray(res.data.templates)) {
        setTemplates(res.data.templates);
      }
    } catch (e: any) {
      console.warn('Error fetching sales templates:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedIndustry]);

  useEffect(() => {
    setLoading(true);
    fetchTemplates();
  }, [fetchTemplates]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTemplates();
  };

  const handleCopy = async (template: any) => {
    try {
      await Clipboard.setStringAsync(template.content);
      setCopiedId(template.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err) {
      Alert.alert('Script Content', template.content);
    }
  };

  const handleTestWhatsApp = (template: any) => {
    const encoded = encodeURIComponent(template.content);
    const url = `whatsapp://send?text=${encoded}`;
    const webUrl = `https://wa.me/?text=${encoded}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          return Linking.openURL(webUrl);
        }
      })
      .catch(() => Linking.openURL(webUrl));
  };

  const handleShare = async (template: any) => {
    try {
      await Share.share({
        title: template.title,
        message: template.content,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.content && t.content.toLowerCase().includes(q)) ||
      (t.category && t.category.toLowerCase().includes(q)) ||
      (t.industry && t.industry.toLowerCase().includes(q))
    );
  });

  const renderTemplate = ({ item }: { item: any }) => {
    const isCopied = copiedId === item.id;

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
          </View>
          <View style={styles.badgeRow}>
            <View style={styles.badgeIndustry}>
              <Text style={styles.badgeIndustryText}>{item.industry}</Text>
            </View>
            <View style={styles.badgeCategory}>
              <Text style={styles.badgeCategoryText}>{item.category}</Text>
            </View>
          </View>
        </View>

        {/* Content Script Box */}
        <View style={styles.scriptBox}>
          <Text style={styles.scriptText}>{item.content}</Text>
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.copyBtn, isCopied && styles.copyBtnActive]}
            onPress={() => handleCopy(item)}
            activeOpacity={0.7}
          >
            {isCopied ? <Check color="#10b981" size={15} /> : <Copy color="#94a3b8" size={15} />}
            <Text style={[styles.copyBtnText, isCopied && { color: '#10b981' }]}>
              {isCopied ? 'Copied!' : 'Copy Script'}
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.shareIconBtn}
              onPress={() => handleShare(item)}
              activeOpacity={0.7}
            >
              <Share2 color="#94a3b8" size={16} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.waBtn}
              onPress={() => handleTestWhatsApp(item)}
              activeOpacity={0.8}
            >
              <MessageSquare color="#ffffff" size={14} />
              <Text style={styles.waBtnText}>Test in WA</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search color="#64748b" size={18} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search scripts, objections, outreach..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Industry Tabs Horizontal Scroll */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {INDUSTRIES.map((ind) => (
            <TouchableOpacity
              key={ind.id}
              style={[
                styles.tabChip,
                selectedIndustry === ind.id && styles.tabChipActive,
              ]}
              onPress={() => setSelectedIndustry(ind.id)}
            >
              <Text
                style={[
                  styles.tabChipText,
                  selectedIndustry === ind.id && styles.tabChipTextActive,
                ]}
              >
                {ind.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator color="#3b82f6" size="large" />
          <Text style={styles.loadingText}>Loading Sales Script Vault...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTemplates}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTemplate}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <BookOpen color="#64748b" size={40} />
              <Text style={styles.emptyTitle}>No Scripts Found</Text>
              <Text style={styles.emptySub}>
                Try adjusting your search filter or selecting another industry category.
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#ffffff',
    fontSize: 14,
  },
  tabsContainer: {
    backgroundColor: '#0b0f19',
    paddingBottom: 8,
  },
  tabsScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  tabChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  tabChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  tabChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContent: {
    padding: 14,
    paddingBottom: 40,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  badgeIndustry: {
    backgroundColor: '#78350f',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeIndustryText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '700',
  },
  badgeCategory: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeCategoryText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
  scriptBox: {
    backgroundColor: '#0a0e17',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 14,
  },
  scriptText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'monospace',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 12,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  copyBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  copyBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  shareIconBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  waBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderStyle: 'dashed',
    borderRadius: 16,
    marginTop: 30,
    gap: 10,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
});
