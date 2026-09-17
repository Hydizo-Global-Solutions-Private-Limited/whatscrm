import React, { createContext, useContext, useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getPendingQueue } from '../database/offlineDb';
import { initSyncQueueListener, processOfflineQueue } from '../services/syncQueue';

interface AppContextType {
  activeEventId: number | null;
  activeEventName: string | null;
  setActiveEvent: (id: number | null, name: string | null) => void;
  isOffline: boolean;
  pendingQueueCount: number;
  triggerSync: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeEventId, setActiveEventId] = useState<number | null>(null);
  const [activeEventName, setActiveEventName] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0);

  useEffect(() => {
    initSyncQueueListener();

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected || !state.isInternetReachable);
    });

    checkQueue();
    const interval = setInterval(checkQueue, 10000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const checkQueue = async () => {
    try {
      const items = await getPendingQueue();
      setPendingQueueCount(items.length);
    } catch {
      // offline db not ready yet
    }
  };

  const setActiveEvent = (id: number | null, name: string | null) => {
    setActiveEventId(id);
    setActiveEventName(name);
  };

  const triggerSync = async () => {
    await processOfflineQueue();
    await checkQueue();
  };

  return (
    <AppContext.Provider
      value={{
        activeEventId,
        activeEventName,
        setActiveEvent,
        isOffline,
        pendingQueueCount,
        triggerSync,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
