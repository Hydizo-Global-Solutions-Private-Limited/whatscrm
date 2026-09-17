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
  Modal,
  Alert,
  Linking,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MobileApi } from '../api/client';
import {
  MessageSquare,
  Heart,
  Plus,
  Send,
  X,
  MapPin,
  Sparkles,
} from 'lucide-react-native';

const CIRCLES = [
  { id: 'all', label: '🌐 All Circles' },
  { id: 'saas_tech', label: '💻 Tech & SaaS' },
  { id: 'real_estate', label: '🏢 Real Estate' },
  { id: 'd2c_ecommerce', label: '📦 D2C Brands' },
  { id: 'manufacturing', label: '🏭 Manufacturing' },
  { id: 'consulting', label: '⚖️ Consulting' },
];

const POST_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'need', label: '📥 Needs' },
  { id: 'offer', label: '🚀 Offers' },
  { id: 'qa', label: '❓ Q&A' },
];

export const CommunityFeedScreen = ({ navigation }: any) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCircle, setSelectedCircle] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Expanded post comments state
  const [expandedComments, setExpandedComments] = useState<{ [postId: number]: any[] }>({});
  const [loadingComments, setLoadingComments] = useState<{ [postId: number]: boolean }>({});
  const [commentInputs, setCommentInputs] = useState<{ [postId: number]: string }>({});

  // Modal create post state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newPostType, setNewPostType] = useState('need');
  const [newCircleId, setNewCircleId] = useState('all');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCity, setNewCity] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);

  const fetchFeed = useCallback(async () => {
    try {
      const params: any = { limit: 50 };
      if (selectedCircle !== 'all') params.circle_id = selectedCircle;
      if (selectedType !== 'all') params.post_type = selectedType;

      const res = await MobileApi.getCommunityFeed(params);
      if (res.data?.success && Array.isArray(res.data.posts)) {
        setPosts(res.data.posts);
      }
    } catch (e: any) {
      console.warn('Error fetching community feed:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCircle, selectedType]);

  useEffect(() => {
    setLoading(true);
    fetchFeed();
  }, [fetchFeed]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeed();
  };

  const handleLike = async (postId: number) => {
    try {
      const res = await MobileApi.likeCommunityPost(postId);
      if (res.data?.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  likes_count: res.data.likes_count,
                  user_liked: res.data.liked ? 1 : 0,
                }
              : p
          )
        );
      }
    } catch (err) {
      console.warn('Like toggle error:', err);
    }
  };

  const toggleComments = async (postId: number) => {
    if (expandedComments[postId]) {
      // Collapse
      setExpandedComments((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      return;
    }

    setLoadingComments((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await MobileApi.getCommunityComments(postId);
      if (res.data?.success && Array.isArray(res.data.comments)) {
        setExpandedComments((prev) => ({ ...prev, [postId]: res.data.comments }));
      }
    } catch (e) {
      console.warn('Fetch comments error:', e);
    } finally {
      setLoadingComments((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const submitComment = async (postId: number) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;

    try {
      const res = await MobileApi.addCommunityComment(postId, text);
      if (res.data?.success) {
        setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
        // Refresh comments list
        const cRes = await MobileApi.getCommunityComments(postId);
        if (cRes.data?.success) {
          setExpandedComments((prev) => ({ ...prev, [postId]: cRes.data.comments }));
        }
        // Update comments count on post
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p))
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not post comment');
    }
  };

  const openWhatsApp = (post: any) => {
    if (!post.author_whatsapp) {
      Alert.alert('Notice', 'Author has not linked a public WhatsApp number.');
      return;
    }
    const cleanNumber = post.author_whatsapp.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Hi ${post.author_name || ''}, I saw your post on MsgMagnet B2B Network regarding: "${post.title}". Let's connect!`
    );
    const url = `whatsapp://send?phone=${cleanNumber}&text=${text}`;
    const webUrl = `https://wa.me/${cleanNumber}?text=${text}`;

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

  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      Alert.alert('Required', 'Please enter a title and description for your post.');
      return;
    }

    setSubmittingPost(true);
    try {
      const res = await MobileApi.createCommunityPost({
        post_type: newPostType,
        title: newTitle.trim(),
        content: newContent.trim(),
        circle_id: newCircleId,
        city: newCity.trim(),
      });

      if (res.data?.success) {
        Alert.alert('Success', 'Your post has been broadcast to the community!');
        setNewTitle('');
        setNewContent('');
        setNewCity('');
        setCreateModalVisible(false);
        fetchFeed();
      } else {
        Alert.alert('Error', res.data?.msg || 'Could not create post');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Network request failed');
    } finally {
      setSubmittingPost(false);
    }
  };

  const renderPost = ({ item }: { item: any }) => {
    const isNeed = item.post_type === 'need';
    const isOffer = item.post_type === 'offer';
    const isQa = item.post_type === 'qa';
    const isLiked = !!item.user_liked;
    const comments = expandedComments[item.id];
    const isCommentsLoading = loadingComments[item.id];

    return (
      <View style={styles.postCard}>
        {/* Header */}
        <View style={styles.postHeader}>
          <View style={styles.authorAvatar}>
            <Text style={styles.avatarText}>{(item.author_name || 'U').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.authorName} numberOfLines={1}>
              {item.author_name || 'MsgMagnet Member'}
            </Text>
            <Text style={styles.authorSub} numberOfLines={1}>
              {item.author_company ? `${item.author_company} • ` : ''}
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>

          {/* Type Badge */}
          <View
            style={[
              styles.typeBadge,
              isNeed ? styles.badgeNeed : isOffer ? styles.badgeOffer : isQa ? styles.badgeQa : styles.badgeGeneral,
            ]}
          >
            <Text style={styles.typeBadgeText}>
              {isNeed ? 'NEED' : isOffer ? 'OFFER' : isQa ? 'Q&A' : 'UPDATE'}
            </Text>
          </View>
        </View>

        {/* Post Title & Content */}
        <Text style={styles.postTitle}>{item.title}</Text>
        <Text style={styles.postContent}>{item.content}</Text>

        {/* Location tag if present */}
        {item.city ? (
          <View style={styles.locationTag}>
            <MapPin color="#94a3b8" size={12} />
            <Text style={styles.locationText}>{item.city}</Text>
          </View>
        ) : null}

        {/* Actions Bar */}
        <View style={styles.actionBar}>
          <View style={styles.leftActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleLike(item.id)}
              activeOpacity={0.7}
            >
              <Heart
                color={isLiked ? '#ef4444' : '#94a3b8'}
                fill={isLiked ? '#ef4444' : 'transparent'}
                size={18}
              />
              <Text style={[styles.actionBtnText, isLiked && { color: '#ef4444' }]}>
                {item.likes_count || 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => toggleComments(item.id)}
              activeOpacity={0.7}
            >
              <MessageSquare color="#94a3b8" size={18} />
              <Text style={styles.actionBtnText}>{item.comments_count || 0}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.whatsAppCta}
            onPress={() => openWhatsApp(item)}
            activeOpacity={0.8}
          >
            <MessageSquare color="#ffffff" size={15} />
            <Text style={styles.whatsAppCtaText}>WhatsApp Inquiry</Text>
          </TouchableOpacity>
        </View>

        {/* Expanded Comments Section */}
        {comments !== undefined && (
          <View style={styles.commentsSection}>
            {isCommentsLoading ? (
              <ActivityIndicator color="#3b82f6" size="small" style={{ marginVertical: 8 }} />
            ) : comments.length === 0 ? (
              <Text style={styles.noCommentsText}>No answers yet. Share your insight below!</Text>
            ) : (
              comments.map((c: any) => (
                <View
                  key={c.id}
                  style={[
                    styles.commentBubble,
                    c.is_ai_response && styles.aiCommentBubble,
                  ]}
                >
                  <View style={styles.commentHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {c.is_ai_response && <Sparkles color="#3b82f6" size={14} />}
                      <Text
                        style={[
                          styles.commentAuthor,
                          c.is_ai_response && { color: '#3b82f6', fontWeight: '800' },
                        ]}
                      >
                        {c.author_name}
                      </Text>
                    </View>
                    {c.is_ai_response ? (
                      <View style={styles.aiBadge}>
                        <Text style={styles.aiBadgeText}>AI PLAYBOOK</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.commentBody}>{c.content}</Text>
                </View>
              ))
            )}

            {/* Add Comment Input */}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentTextInput}
                placeholder="Write a solution or answer..."
                placeholderTextColor="#64748b"
                value={commentInputs[item.id] || ''}
                onChangeText={(val) => setCommentInputs((prev) => ({ ...prev, [item.id]: val }))}
              />
              <TouchableOpacity
                style={styles.sendCommentBtn}
                onPress={() => submitComment(item.id)}
              >
                <Send color="#ffffff" size={16} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Circle Categories Scroll */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.circlesScroll}
        >
          {CIRCLES.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.filterChip, selectedCircle === c.id && styles.filterChipActive]}
              onPress={() => setSelectedCircle(c.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedCircle === c.id && styles.filterChipTextActive,
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Post Type Segment Filter */}
        <View style={styles.typeSegment}>
          {POST_TYPES.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.segmentBtn, selectedType === t.id && styles.segmentBtnActive]}
              onPress={() => setSelectedType(t.id)}
            >
              <Text
                style={[
                  styles.segmentBtnText,
                  selectedType === t.id && styles.segmentBtnTextActive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Main Feed List */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator color="#3b82f6" size="large" />
          <Text style={styles.loadingText}>Fetching B2B Lead Broadcasts...</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPost}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>📢 No Posts in this Circle</Text>
              <Text style={styles.emptySub}>
                Be the first to broadcast a buying requirement or service offer!
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Action Button for Post Creation */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setCreateModalVisible(true)}
        activeOpacity={0.8}
      >
        <Plus color="#ffffff" size={28} />
      </TouchableOpacity>

      {/* Create Post Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📢 Broadcast to Community</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <X color="#94a3b8" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Type selector */}
              <Text style={styles.inputLabel}>Post Type</Text>
              <View style={styles.modalTypeRow}>
                {[
                  { id: 'need', label: '📥 Need' },
                  { id: 'offer', label: '🚀 Offer' },
                  { id: 'qa', label: '❓ Q&A' },
                  { id: 'general', label: '💬 General' },
                ].map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.modalTypeBtn,
                      newPostType === t.id && styles.modalTypeBtnActive,
                    ]}
                    onPress={() => setNewPostType(t.id)}
                  >
                    <Text
                      style={[
                        styles.modalTypeBtnText,
                        newPostType === t.id && styles.modalTypeBtnTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Title input */}
              <Text style={styles.inputLabel}>Headline / Requirement</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Looking for corrugate box manufacturers"
                placeholderTextColor="#64748b"
                value={newTitle}
                onChangeText={setNewTitle}
              />

              {/* Content input */}
              <Text style={styles.inputLabel}>Details & Specifications</Text>
              <TextInput
                style={[styles.textInput, { height: 90, textAlignVertical: 'top' }]}
                placeholder="Specify volumes, deadlines, or project scope..."
                placeholderTextColor="#64748b"
                value={newContent}
                onChangeText={setNewContent}
                multiline
              />

              {/* City input */}
              <Text style={styles.inputLabel}>Location / City (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Mumbai, Bengaluru, Delhi NCR"
                placeholderTextColor="#64748b"
                value={newCity}
                onChangeText={setNewCity}
              />

              <TouchableOpacity
                style={styles.submitPostBtn}
                onPress={handleCreatePost}
                disabled={submittingPost}
              >
                {submittingPost ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.submitPostBtnText}>🚀 Broadcast Now</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  filterContainer: {
    backgroundColor: '#0d1424',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingVertical: 10,
  },
  circlesScroll: {
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1e293b',
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
  },
  filterChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  typeSegment: {
    flexDirection: 'row',
    marginHorizontal: 14,
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#1e293b',
  },
  segmentBtnText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  segmentBtnTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  listContent: {
    padding: 14,
    paddingBottom: 80,
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
  postCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginBottom: 14,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  authorName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  authorSub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeNeed: {
    backgroundColor: '#7f1d1d',
  },
  badgeOffer: {
    backgroundColor: '#78350f',
  },
  badgeQa: {
    backgroundColor: '#1e3a8a',
  },
  badgeGeneral: {
    backgroundColor: '#334155',
  },
  typeBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  postTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 22,
  },
  postContent: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locationText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 12,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  whatsAppCta: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  whatsAppCtaText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  commentsSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    borderStyle: 'dashed',
    paddingTop: 12,
  },
  noCommentsText: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 8,
  },
  commentBubble: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  aiCommentBubble: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  aiBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  commentBody: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: '#0d1424',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    color: '#ffffff',
    fontSize: 13,
  },
  sendCommentBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderStyle: 'dashed',
    borderRadius: 16,
    marginTop: 20,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0d1424',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
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
    fontWeight: '800',
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  modalTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  modalTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#111827',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalTypeBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  modalTypeBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  modalTypeBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
  },
  submitPostBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  submitPostBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
