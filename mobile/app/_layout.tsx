import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { initI18n } from '../i18n';
import { supabase } from '../services/supabase';
import { Session } from '@supabase/supabase-js';

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

  return <RootLayoutNav session={session} authReady={authReady} />;
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

