import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from '@expo-google-fonts/outfit';
import {
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';

import { PushToastHost } from '@/components/common/pushToastHost';
import { useAppTheme } from '@/components/common/appThemeContext';
import { ThemeProvider as AppThemeProvider } from '@/components/common/ThemeProvider';
import { useNotifications } from '@/hooks/useNotifications';
import { initAuthStore, useAuthStore } from '@/stores/authStore';

import '../global.css';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });
  const authHydrated = useAuthStore((s) => !s.sessionLoading);
  const splashHiddenRef = useRef(false);

  useEffect(() => {
    return initAuthStore();
  }, []);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && authHydrated && !splashHiddenRef.current) {
      splashHiddenRef.current = true;
      void SplashScreen.hideAsync();
    }
  }, [loaded, authHydrated]);

  if (!loaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <RootLayoutNav />
      </AppThemeProvider>
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const { nightMode } = useAppTheme();
  useNotifications();

  return (
    <ThemeProvider value={nightMode ? DarkTheme : DefaultTheme}>
      <PushToastHost />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="pharmacy/[id]" options={{ title: 'Détails' }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: 'Introuvable' }} />
      </Stack>
    </ThemeProvider>
  );
}
