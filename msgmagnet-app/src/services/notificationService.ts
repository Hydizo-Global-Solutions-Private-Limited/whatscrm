import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '../api/client';

// Configure foreground notification behavior (SDK 52 compliant)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register device for Push Notifications (FCM / APNs)
 */
export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  let token: string | null = null;

  try {
    const existingPerms: any = await Notifications.getPermissionsAsync();
    let isGranted = existingPerms?.granted || existingPerms?.status === 'granted';

    if (!isGranted) {
      const requestPerms: any = await Notifications.requestPermissionsAsync();
      isGranted = requestPerms?.granted || requestPerms?.status === 'granted';
    }

    if (!isGranted) {
      console.log('Failed to obtain push notification token permission');
      return null;
    }

    // Android specific channel setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('msgmagnet_leads', {
        name: 'MsgMagnet CRM & Leads',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563eb',
      });
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    token = tokenResponse.data;

    if (token) {
      // Register token with MsgMagnet backend
      await api.post('/api/notifications/register_token', {
        token,
        platform: Platform.OS,
      });
      console.log('Registered device push token:', token);
    }
  } catch (err: any) {
    console.log('Push notification registration notice:', err.message);
  }

  return token;
};

/**
 * Schedule a local task reminder notification
 */
export const scheduleTaskReminder = async (title: string, body: string, secondsFromNow: number = 60) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, secondsFromNow),
        repeats: false,
      },
    });
  } catch (err) {
    console.warn('Could not schedule local reminder:', err);
  }
};
