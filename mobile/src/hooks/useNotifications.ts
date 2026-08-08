import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { notificationService } from '../services/notification.service';
import { useAuthStore } from '../store/auth.store';

// Safely require expo-notifications to prevent load-time crash in Expo Go SDK 53+ on Android
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
  
  if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch (err) {
  console.warn('[useNotifications] expo-notifications could not be loaded safely (expected in Expo Go SDK 53+):', err);
}

export const useNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState('');
  const user = useAuthStore((state) => state.user);
  const updatePreferences = useAuthStore((state) => state.updatePreferences);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated && user) {
      registerForPushNotificationsAsync()
        .then(async (token) => {
          if (token) {
            setExpoPushToken(token);
            try {
              // 1. Send token to backend
              await notificationService.registerDeviceToken(token);
              // 2. Enable push alerts preference in user store
              await updatePreferences({ push_alerts_enabled: true });
              console.log('[useNotifications] Device push token registered successfully:', token);
            } catch (err) {
              console.error('[useNotifications] Failed to send device token to backend:', err);
            }
          }
        })
        .catch((err) => console.error('[useNotifications] Push registration failed:', err));
    }
  }, [isAuthenticated, user?.id]);

  return {
    expoPushToken,
  };
};

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return null;

  if (Platform.OS === 'android' && Notifications && typeof Notifications.setNotificationChannelAsync === 'function') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance?.MAX || 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    } catch (err) {
      console.error('[useNotifications] Failed to set Android notification channel:', err);
    }
  }

  if (!Device.isDevice || !Notifications) {
    console.warn('[useNotifications] Must use physical device for Push Notifications or Notifications module is missing. Falling back to mock ExponentPushToken for local testing.');
    return 'ExponentPushToken[MockTokenForLocalTesting]';
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[useNotifications] Permission not granted for push notifications!');
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;
    return token;
  } catch (e) {
    console.error('[useNotifications] Error getting Expo push token:', e);
    return 'ExponentPushToken[MockTokenForLocalTesting]';
  }
}
export default useNotifications;
