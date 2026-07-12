import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Requests notification permissions and returns the Expo Push Token.
 * On Android, also creates a default notification channel.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('[notifications] Must use physical device for push notifications');
    return null;
  }

  // Check existing permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[notifications] Permission not granted');
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Sakhi Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E67E80',
    });
  }

  // Get the Expo push token
  try {
    const projectId = 
      Constants.expoConfig?.extra?.eas?.projectId ?? 
      Constants.easConfig?.projectId;
    
    if (!projectId) {
      console.warn('[notifications] No Expo projectId found. Skipping push registration (this is normal in local Expo Go previews before EAS init).');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    console.log('[notifications] Push token:', token);
    return token;
  } catch (error) {
    console.error('[notifications] Failed to get push token:', error);
    return null;
  }
}

/**
 * Saves the Expo push token to the user's profile in Supabase.
 */
export async function savePushTokenToProfile(token: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ expo_push_token: token })
      .eq('id', user.id);

    console.log('[notifications] Push token saved to profile');
  } catch (error) {
    console.error('[notifications] Failed to save push token:', error);
  }
}

/**
 * Schedules a daily local notification at 8:00 PM reminding the user
 * to log their symptoms. This runs entirely on the device — no server needed.
 */
export async function scheduleDailySymptomReminder(): Promise<void> {
  // Cancel any existing scheduled reminders to avoid duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Sakhi Reminder 🌸',
      body: "Don't forget to log your symptoms today! Tracking helps Sakhi give better insights.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20, // 8:00 PM
      minute: 0,
    },
  });

  console.log('[notifications] Daily symptom reminder scheduled for 8:00 PM');
}

/**
 * Cancels all scheduled local notifications.
 */
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('[notifications] All reminders cancelled');
}
