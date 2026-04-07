import { BlurView } from 'expo-blur';
import { type ReactElement, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/components/common/appThemeContext';

export type GlassPanelProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Style du conteneur interne (sous le voile). */
  contentStyle?: StyleProp<ViewStyle>;
  borderRadius?: number;
  /** Intensité du flou (iOS typique 20–80). */
  intensity?: number;
};

/**
 * Panneau « liquid glass » : flou natif + bordure lumineuse + voile léger.
 */
export function GlassPanel({
  children,
  style,
  contentStyle,
  borderRadius = 20,
  intensity,
}: GlassPanelProps): ReactElement {
  const { theme: t, nightMode } = useAppTheme();

  const blurAmount =
    intensity ?? (nightMode ? Platform.OS === 'android' ? 48 : 36 : Platform.OS === 'android' ? 56 : 64);

  const borderColor = nightMode
    ? 'rgba(255,255,255,0.14)'
    : 'rgba(255,255,255,0.72)';
  const veil = nightMode ? 'rgba(18,22,28,0.42)' : 'rgba(255,255,255,0.38)';
  const shadow = nightMode
    ? { shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }
    : { shadowColor: t.accent, shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } };

  const outer: ViewStyle = {
    borderRadius,
    borderWidth: 1,
    borderColor,
    overflow: 'hidden',
    ...shadow,
    elevation: nightMode ? 8 : 4,
  };

  if (Platform.OS === 'web') {
    return (
      <View style={[outer, { backgroundColor: veil }, style]}>
        <View style={contentStyle}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[outer, style]}>
      <BlurView
        intensity={blurAmount}
        tint={nightMode ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View style={[{ backgroundColor: veil }, contentStyle]}>{children}</View>
    </View>
  );
}
