import { useEffect, useMemo, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  AppThemeContext,
  type AppThemeContextValue,
} from '@/components/common/appThemeContext';
import { useNightMode } from '@/hooks/useNightMode';
import { theme as themeTokens } from '@/lib/constants';

export type { AppThemeContextValue } from '@/components/common/appThemeContext';

type ThemeProviderProps = {
  children: ReactNode;
};

/**
 * Fournit le thème applicatif (tokens specs §5) via React Context.
 * Le fond du shell anime entre jour et nuit (Reanimated).
 */
export function ThemeProvider({ children }: ThemeProviderProps): ReactElement {
  const { theme: palette, nightMode, toggleNightMode } = useNightMode();
  const progress = useSharedValue(nightMode ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(nightMode ? 1 : 0, { duration: 420 });
  }, [nightMode, progress]);

  const shellStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [themeTokens.day.bg, themeTokens.night.bg],
    ),
  }));

  const value = useMemo(
    (): AppThemeContextValue => ({
      theme: palette,
      nightMode,
      toggleNightMode,
    }),
    [palette, nightMode, toggleNightMode],
  );

  /* Fond animé en calque — les enfants restent dans une View RN (contexte OK). */
  return (
    <AppThemeContext.Provider value={value}>
      <View style={styles.shell}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, shellStyle]}
        />
        <View style={styles.content}>{children}</View>
      </View>
    </AppThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  content: { flex: 1 },
});

/** Fournisseur de thème fixe (jour) pour les tests RNTL — évite Zustand / persistance. */
export function TestAppThemeProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const value = useMemo(
    (): AppThemeContextValue => ({
      theme: themeTokens.day,
      nightMode: false,
      toggleNightMode: () => undefined,
    }),
    [],
  );
  return (
    <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
  );
}
