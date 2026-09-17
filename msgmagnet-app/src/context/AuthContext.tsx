import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { MobileApi, TOKEN_STORAGE_KEY, initApiConfig } from '../api/client';
import { registerForPushNotificationsAsync } from '../services/notificationService';

export interface User {
  id: number;
  email: string;
  name?: string;
  role?: string;
  plan?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: { email?: string; username?: string; password?: string }) => Promise<{ success: boolean; msg?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    bootstrapAuth();
  }, []);

  const bootstrapAuth = async () => {
    try {
      await initApiConfig();
      const savedToken = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
      if (savedToken) {
        setToken(savedToken);
        // Attempt to fetch my profile to validate session
        try {
          const res = await MobileApi.getMyProfile();
          if (res.data && res.data.profile) {
            setUser({
              id: res.data.profile.uid,
              email: res.data.profile.email || '',
              name: res.data.profile.display_name || res.data.profile.username,
            });
          }
        } catch {
          // Token may be valid but profile empty or offline, retain token
        }
      }
    } catch (e) {
      console.warn('Error during auth bootstrapping:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: { email?: string; username?: string; password?: string }) => {
    setIsLoading(true);
    try {
      // Backend expects either email/password or pass
      const payload: any = {
        email: credentials.email || credentials.username,
        password: credentials.password,
        pass: credentials.password,
      };

      const res = await MobileApi.login(payload);
      if (res.data && (res.data.token || res.data.data?.token)) {
        const receivedToken = res.data.token || res.data.data.token;
        const userData = res.data.user || res.data.data?.user || {
          id: 1,
          email: credentials.email || 'user@user.com',
        };

        await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, receivedToken);
        setToken(receivedToken);
        setUser(userData);
        registerForPushNotificationsAsync().catch(() => {});
        return { success: true };
      } else {
        return { success: false, msg: res.data?.msg || 'Invalid email or password' };
      }
    } catch (err: any) {
      const msg = err.response?.data?.msg || err.message || 'Login connection failed';
      return { success: false, msg };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
      setToken(null);
      setUser(null);
    } catch (e) {
      console.warn('Error clearing token:', e);
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await MobileApi.getMyProfile();
      if (res.data?.profile) {
        setUser((prev) => ({
          id: prev?.id || res.data.profile.uid,
          email: res.data.profile.email || prev?.email || '',
          name: res.data.profile.display_name || prev?.name,
        }));
      }
    } catch (e) {
      console.warn('Could not refresh profile:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
