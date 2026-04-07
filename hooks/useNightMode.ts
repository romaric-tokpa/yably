import { useEffect, useMemo } from 'react';
import { Appearance } from 'react-native';

import { theme, type ThemeColors } from '@/lib/constants';
import { useUIStore } from '@/stores/uiStore';

export type UseNightModeResult = {
  /** Palette active (jour ou nuit) */
  theme: ThemeColors;
  nightMode: boolean;
  toggleNightMode: () => void;
};

/**
 * Mode nuit : auto 20h–6h, override manuel jusqu’à la prochaine frontière 6h/20h (Zustand).
 */
export function useNightMode(): UseNightModeResult {
  const nightMode = useUIStore((s) => s.nightMode);
  const toggleNightMode = useUIStore((s) => s.toggleNightMode);
  const refreshNightMode = useUIStore((s) => s.refreshNightMode);

  useEffect(() => {
    refreshNightMode();
    const intervalId = setInterval(() => {
      refreshNightMode();
    }, 60_000);
    return () => clearInterval(intervalId);
  }, [refreshNightMode]);

  /** Recalcule le thème quand le mode clair/sombre système change. */
  useEffect(() => {
    const sub = Appearance.addChangeListener(() => {
      useUIStore.getState().refreshNightMode();
    });
    return () => sub.remove();
  }, []);

  const activePalette = useMemo(
    (): ThemeColors => (nightMode ? theme.night : theme.day),
    [nightMode],
  );

  return {
    theme: activePalette,
    nightMode,
    toggleNightMode,
  };
}
