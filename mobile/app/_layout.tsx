import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useEffect, useState, useRef } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import 'react-native-reanimated';
import { initI18n } from '../i18n';
import { supabase } from '../services/supabase';
import { Session } from '@supabase/supabase-js';
import {
  registerForPushNotifications,
  savePushTokenToProfile,
  scheduleDailySymptomReminder,
} from '../services/notifications';
import { ThemeProvider as SakhiThemeProvider } from '../services/themeContext';

import { useColorScheme } from '@/components/useColorScheme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(auth)/welcome',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// ─── Auth Guard Hook ────────────────────────────────────────────────────────
// Watches Supabase session state and redirects accordingly:
//   • No session  → send to (auth)/welcome
//   • Has session → send to (tabs) if still on an auth screen
function useAuthGuard(session: Session | null, authReady: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!authReady) return; // wait until we know the session state

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Not logged in and not already on an auth screen → redirect to welcome
      router.replace('/(auth)/welcome');
    } else if (session && inAuthGroup) {
      // Logged in but still on an auth screen → redirect to main app
      router.replace('/(tabs)');
    }
  }, [session, authReady, segments]);
}

// ─── Root Layout ────────────────────────────────────────────────────────────
export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Initialize translations
  useEffect(() => {
    initI18n()
      .then(() => setI18nReady(true))
      .catch(err => {
        console.error('Failed to init i18n', err);
        setI18nReady(true);
      });
  }, []);

  // Check for updates on app start
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const response = await fetch('https://trysakhiai.vercel.app/version.json');
        if (!response.ok) return;
        const data = await response.json();
        
        const latestVersion = data.latest;
        const currentVersion = Constants.expoConfig?.version;
        
        if (latestVersion && currentVersion && latestVersion !== currentVersion) {
          const isNewer = (latest: string, current: string) => {
            const lParts = latest.split('.').map(Number);
            const cParts = current.split('.').map(Number);
            for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
              const l = lParts[i] || 0;
              const c = cParts[i] || 0;
              if (l > c) return true;
              if (l < c) return false;
            }
            return false;
          };
          
          if (isNewer(latestVersion, currentVersion)) {
            Alert.alert(
              'Update Available! 🚀',
              `A new version of Sakhi (v${latestVersion}) is available. Please update now to get the latest features and bug fixes.`,
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Update Now', 
                  onPress: () => Linking.openURL('https://trysakhiai.vercel.app') 
                }
              ]
            );
          }
        }
      } catch (err) {
        console.log('[updater] Failed to check for updates:', err);
      }
    };
    
    const timer = setTimeout(checkForUpdates, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Bootstrap Supabase session once on mount, then listen for changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Register push notifications when user is authenticated
  useEffect(() => {
    if (!authReady || !session) return;

    (async () => {
      // 1. Get push token and save it to profile (if FCM is configured for standalone)
      const token = await registerForPushNotifications();
      if (token) {
        await savePushTokenToProfile(token);
      }
      
      // 2. Schedule local daily reminders regardless of token status, as long as permission is granted
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        await scheduleDailySymptomReminder();
      } else {
        console.log('[notifications] Cannot schedule daily reminders: Permission status is:', status);
      }
    })();
  }, [authReady, session]);

  // One-time connectivity check on app start
  useEffect(() => {
    if (!authReady || !session) return;
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://sakhiai.up.railway.app';
    fetch(API_URL, { method: 'HEAD' }).catch(() => {
      Alert.alert(
        'No Internet Connection 📡',
        'Some features like AI Chat, Meal Plans, and Lab Reports need an internet connection. Symptom logging will work offline and sync later.'
      );
    });
  }, [authReady, session]);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && i18nReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, i18nReady]);

  if (!loaded || !i18nReady) {
    return null;
  }

  return (
    <SakhiThemeProvider>
      <RootLayoutNav session={session} authReady={authReady} />
    </SakhiThemeProvider>
  );
}

// ─── Navigation Tree ─────────────────────────────────────────────────────────
function RootLayoutNav({ session, authReady }: { session: Session | null; authReady: boolean }) {
  const colorScheme = useColorScheme();

  // Apply auth guard — handles all redirects
  useAuthGuard(session, authReady);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Auth screens — always accessible so the redirect can land here */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        {/* Main app screens — protected by the auth guard above */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen name="lab-report" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}

