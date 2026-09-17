import NetInfo from '@react-native-community/netinfo';
import { getPendingQueue, markQueueProcessed, incrementQueueAttempts } from '../database/offlineDb';
import { MobileApi } from '../api/client';

let isSyncing = false;

export const processOfflineQueue = async () => {
  if (isSyncing) return;

  const netState = await NetInfo.fetch();
  if (!netState.isConnected || !netState.isInternetReachable) {
    return;
  }

  try {
    isSyncing = true;
    const pendingItems = await getPendingQueue();

    for (const item of pendingItems) {
      if (item.attempts > 5) {
        // Skip items that have failed too many times
        continue;
      }

      try {
        const payload = JSON.parse(item.payload);

        switch (item.action_type) {
          case 'scan':
            await MobileApi.scanCardImage(payload.image, payload.event_id);
            break;

          case 'task':
            await MobileApi.createTask(payload);
            break;

          case 'pipeline':
            await MobileApi.movePipelineStage(payload.contact_id, payload.stage);
            break;

          case 'location':
            await MobileApi.updateContactLocation(payload.contact_id, payload.lat, payload.lng);
            break;

          default:
            console.warn('Unknown sync action type:', item.action_type);
        }

        await markQueueProcessed(item.queue_id);
      } catch (err: any) {
        console.warn(`Sync failed for item ${item.queue_id}:`, err?.message || err);
        await incrementQueueAttempts(item.queue_id);
      }
    }
  } catch (err) {
    console.error('Error during offline queue sync:', err);
  } finally {
    isSyncing = false;
  }
};

// Initialize listener for auto-syncing when internet reconnects
export const initSyncQueueListener = () => {
  NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      processOfflineQueue();
    }
  });
};
