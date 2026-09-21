import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Ambient declaration for React Native runtime global
declare const __DEV__: boolean;

// Production backend host for MsgMagnet CRM (supports local network IP for physical devices)
export const PRODUCTION_API_URL = 'http://192.168.1.2:3010';
export const LOCAL_DEV_API_URL = 'http://192.168.1.2:3010';

export const DEFAULT_API_URL = 'http://192.168.1.2:3010';

export const TOKEN_STORAGE_KEY = 'msgmagnet_jwt_token';
export const API_URL_STORAGE_KEY = 'msgmagnet_custom_api_url';

export const api = axios.create({
  baseURL: DEFAULT_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configure dynamic API base URL
export const setBaseUrl = async (url: string) => {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  api.defaults.baseURL = cleanUrl;
  try {
    await SecureStore.setItemAsync(API_URL_STORAGE_KEY, cleanUrl);
  } catch (e) {
    console.warn('Could not persist custom API URL:', e);
  }
};

// Initialize persisted custom API URL if available
export const initApiConfig = async () => {
  try {
    const savedUrl = await SecureStore.getItemAsync(API_URL_STORAGE_KEY);
    if (savedUrl && savedUrl.trim().length > 0) {
      api.defaults.baseURL = savedUrl.trim().replace(/\/+$/, '');
    } else {
      api.defaults.baseURL = DEFAULT_API_URL;
    }
  } catch (e) {
    console.warn('Error reading saved API URL:', e);
    api.defaults.baseURL = DEFAULT_API_URL;
  }
};

// Request interceptor to attach JWT
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn('Error reading token from SecureStore:', err);
  }
  return config;
});

// API Helper Endpoints
export const MobileApi = {
  // Auth
  login: async (credentials: { email?: string; username?: string; password?: string; pass?: string }) => {
    return api.post('/api/user/login', credentials);
  },
  signup: async (userData: {
    name: string;
    email: string;
    password: string;
    mobile_with_country_code: string;
    acceptPolicy: boolean;
  }) => {
    return api.post('/api/user/signup', userData);
  },

  // Card Scanning
  scanCardImage: async (base64Image: string, eventId?: number | null) => {
    return api.post('/api/card_scan/upload', { image: base64Image, event_id: eventId });
  },
  batchScan: async (images: string[], eventId?: number | null) => {
    return api.post('/api/card_scan/batch', { images, event_id: eventId });
  },
  getScanHistory: async () => {
    return api.get('/api/card_scan/history');
  },
  updateContact: async (contactId: number, data: any) => {
    return api.put(`/api/card_scan/contact/${contactId}`, data);
  },

  // Leads & Pipeline
  getPipelineBoard: async () => {
    return api.get('/api/pipeline/board');
  },
  movePipelineStage: async (contactId: number, stage: string) => {
    return api.post('/api/pipeline/move', { contact_id: contactId, stage });
  },
  setLeadTemperature: async (contactId: number, temperature: 'hot' | 'warm' | 'cold') => {
    return api.post('/api/pipeline/temperature', { contact_id: contactId, temperature });
  },

  // Contacts
  getContacts: async () => {
    return api.get('/api/network_map/contacts');
  },
  updateContactLocation: async (contactId: number, lat: number, lng: number) => {
    return api.post('/api/network_map/update_location', { contact_id: contactId, lat, lng });
  },

  // Events
  getEvents: async () => {
    return api.get('/api/events');
  },
  createEvent: async (eventData: { name: string; location?: string; start_date?: string; end_date?: string; description?: string }) => {
    return api.post('/api/events', eventData);
  },

  // Tasks & Voice CRM
  getTasks: async (filter?: string) => {
    return api.get('/api/tasks', { params: { filter } });
  },
  createTask: async (taskData: { title: string; due_date?: string; contact_id?: number; priority?: string }) => {
    return api.post('/api/tasks', taskData);
  },
  updateTask: async (taskId: number, updates: any) => {
    return api.put(`/api/tasks/${taskId}`, updates);
  },
  voiceToTask: async (audioBase64: string, mimeType: string = 'audio/m4a') => {
    return api.post('/api/tasks/voice', { audio: audioBase64, mimeType });
  },

  // Profile & Personas
  getMyProfile: async (persona?: string) => {
    return api.get('/api/profile/my', { params: { persona } });
  },
  getPersonas: async () => {
    return api.get('/api/profile/personas');
  },
  saveProfile: async (profileData: any) => {
    return api.post('/api/profile/save', profileData);
  },

  // Meeting Voice Summarizer & Action Item Extractor (Hybrid Engine)
  summarizeMeeting: async (data: {
    audioBase64: string;
    mimeType?: string;
    mode?: 'local' | 'cloud';
    meetingTitle?: string;
    attendeeName?: string;
    contact_id?: number;
  }) => {
    return api.post('/api/meeting/summarize', data);
  },

  // Round-Robin Team Agents
  getTeamAgents: async () => {
    return api.get('/api/agents/list');
  },
  assignLeadNext: async (contactId: number) => {
    return api.post('/api/agents/assign_next', { contact_id: contactId });
  },

  // Webhooks & CRM Connectors
  getWebhooks: async () => {
    return api.get('/api/webhooks/list');
  },

  // Automated WhatsApp Ghosting Reviver
  getReviverProgress: async () => {
    return api.get('/api/reviver/progress');
  },
  enrollInReviver: async (contactId: number, sequenceId?: number) => {
    return api.post('/api/reviver/enroll', { contact_id: contactId, sequence_id: sequenceId });
  },

  // Interactive Email Signatures
  getEmailSignatures: async () => {
    return api.get('/api/signature/all');
  },

  // Fair Usage
  getFairUsage: async () => {
    return api.get('/api/fair_usage/status');
  },

  // Google Sync
  getGoogleSyncStatus: async () => {
    return api.get('/api/google_sync/status');
  },
  pushGoogleSheets: async (eventId?: number) => {
    return api.post('/api/google_sync/push_sheets', { event_id: eventId });
  },

  // B2B Community & Lead Broadcast Feed
  getCommunityCircles: async () => {
    return api.get('/api/community/circles');
  },
  getCommunityFeed: async (params?: { circle_id?: string; post_type?: string; event_id?: number; search?: string; limit?: number; offset?: number }) => {
    return api.get('/api/community/feed', { params });
  },
  createCommunityPost: async (postData: {
    post_type: string;
    title: string;
    content: string;
    category?: string;
    city?: string;
    media_urls?: string[];
    event_id?: number;
    circle_id?: string;
  }) => {
    return api.post('/api/community/post', postData);
  },
  likeCommunityPost: async (postId: number) => {
    return api.post(`/api/community/${postId}/like`);
  },
  getCommunityComments: async (postId: number) => {
    return api.get(`/api/community/${postId}/comments`);
  },
  addCommunityComment: async (postId: number, content: string) => {
    return api.post(`/api/community/${postId}/comment`, { content });
  },

  // WhatsApp Sales Script & Template Vault
  getSalesTemplates: async (params?: { industry?: string; category?: string }) => {
    return api.get('/api/community/templates', { params });
  },
};
