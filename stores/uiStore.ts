import { Appearance } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { computeAutoNight } from '@/lib/nightMode';
import { getZustandPersistStorage } from '@/lib/platformStorage';

export type ViewMode = 'map' | 'list';

/** Prochaine frontière 6h ou 20h locale (fin de validité de l’override). */
function getNextCycleBoundary(date: Date): Date {
  const candidates: Date[] = [];
  for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
    const atSix = new Date(date);
    atSix.setDate(atSix.getDate() + dayOffset);
    atSix.setHours(6, 0, 0, 0);
    if (atSix.getTime() > date.getTime()) {
      candidates.push(atSix);
    }

    const atTwenty = new Date(date);
    atTwenty.setDate(atTwenty.getDate() + dayOffset);
    atTwenty.setHours(20, 0, 0, 0);
    if (atTwenty.getTime() > date.getTime()) {
      candidates.push(atTwenty);
    }
  }

  if (candidates.length === 0) {
    const fallback = new Date(date);
    fallback.setDate(fallback.getDate() + 2);
    fallback.setHours(6, 0, 0, 0);
    return fallback;
  }

  return new Date(Math.min(...candidates.map((c) => c.getTime())));
}

export type UIState = {
  nightMode: boolean;
  nightModeOverride: boolean | null;
  /** Timestamp ms ; null si pas d’override actif */
  nightModeOverrideExpiresAt: number | null;
  viewMode: ViewMode;
  /** Compteur notifications non lues (badge cloche — brancher expo-notifications plus tard). */
  unreadNotificationCount: number;
  refreshNightMode: () => void;
  toggleNightMode: () => void;
  setViewMode: (mode: ViewMode) => void;
  setUnreadNotificationCount: (count: number) => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      nightMode: computeAutoNight(new Date()),
      nightModeOverride: null,
      nightModeOverrideExpiresAt: null,
      viewMode: 'list',
      unreadNotificationCount: 0,

      refreshNightMode: () => {
        const now = new Date();
        let { nightModeOverride, nightModeOverrideExpiresAt } = get();

        if (
          nightModeOverride !== null &&
          nightModeOverrideExpiresAt !== null &&
          now.getTime() >= nightModeOverrideExpiresAt
        ) {
          nightModeOverride = null;
          nightModeOverrideExpiresAt = null;
        }

        const scheduleNight = computeAutoNight(now);
        const systemDark = Appearance.getColorScheme() === 'dark';
        const autoNight = scheduleNight || systemDark;
        const effectiveNight =
          nightModeOverride !== null &&
          nightModeOverrideExpiresAt !== null &&
          now.getTime() < nightModeOverrideExpiresAt
            ? nightModeOverride
            : autoNight;

        set({
          nightMode: effectiveNight,
          nightModeOverride,
          nightModeOverrideExpiresAt,
        });
      },

      toggleNightMode: () => {
        const now = new Date();
        get().refreshNightMode();
        const current = get().nightMode;
        const next = !current;
        const expiresAt = getNextCycleBoundary(now).getTime();
        set({
          nightModeOverride: next,
          nightModeOverrideExpiresAt: expiresAt,
          nightMode: next,
        });
      },

      setViewMode: (mode) => {
        set({ viewMode: mode });
      },

      setUnreadNotificationCount: (count) => {
        set({ unreadNotificationCount: count });
      },
    }),
    {
      name: 'pharmacie-garde-ui',
      storage: createJSONStorage(getZustandPersistStorage),
      partialize: (state) => ({
        nightModeOverride: state.nightModeOverride,
        nightModeOverrideExpiresAt: state.nightModeOverrideExpiresAt,
        viewMode: state.viewMode,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<
          Pick<
            UIState,
            'nightModeOverride' | 'nightModeOverrideExpiresAt' | 'viewMode'
          >
        >;
        return {
          ...current,
          ...p,
        };
      },
      onRehydrateStorage: () => {
        return () => {
          useUIStore.getState().refreshNightMode();
        };
      },
    },
  ),
);
