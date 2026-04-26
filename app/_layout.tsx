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
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { PushToastHost } from '@/components/common/pushToastHost';
import { useAppTheme } from '@/components/common/appThemeContext';
import { ThemeProvider as AppThemeProvider } from '@/components/common/ThemeProvider';
import { useNotifications } from '@/hooks/useNotifications';
import { theme } from '@/lib/constants';
import { initAuthStore, useAuthStore } from '@/stores/authStore';

import '../global.css';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const splashLogo = require('../assets/images/splash-icon.png');

/** Web : pas d’écran splash natif comme sur iOS/Android — logo + indicateur pendant le chargement des polices. */
function BootSplashView() {
  return (
    <View
      style={[bootStyles.root, { backgroundColor: theme.day.bg }]}
      accessibilityLabel="Chargement de l’application"
    >
      <Image
        source={splashLogo}
        style={bootStyles.logo}
        contentFit="contain"
        transition={0}
      />
      <ActivityIndicator color={theme.day.primary} size="large" style={bootStyles.spinner} />
    </View>
  );
}

const bootStyles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 160,
    height: 160,
  },
  spinner: {
    marginTop: 28,
  },
});

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
    return Platform.OS === 'web' ? <BootSplashView /> : null;
  }

  /* Web : garder logo + spinner jusqu’à session locale lue (pas d’overlay splash système). */
  if (Platform.OS === 'web' && !authHydrated) {
    return <BootSplashView />;
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
