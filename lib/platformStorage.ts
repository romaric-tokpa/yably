/**
 * Adapters stockage selon plateforme + SSR Expo Router (Node sans window).
 */

import type { StateStorage } from 'zustand/middleware';
import { Platform } from 'react-native';

function memoryKeyValueStorage(): Pick<
  StateStorage,
  'getItem' | 'setItem' | 'removeItem'
> {
  const map = new Map<string, string>();
  return {
    getItem: async (name: string) => map.get(name) ?? null,
    setItem: async (name: string, value: string) => {
      map.set(name, value);
    },
    removeItem: async (name: string) => {
      map.delete(name);
    },
  };
}

let ssrUiPersistSingleton: StateStorage | null = null;

/** Session Supabase : SecureStore natif, localStorage navigateur, mémoire en SSR web. */
export function createSupabaseAuthStorage(): {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
} {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') {
      return memoryKeyValueStorage();
    }
    return {
      getItem: async (key: string) => window.localStorage.getItem(key),
      setItem: async (key: string, value: string) => {
        window.localStorage.setItem(key, value);
      },
      removeItem: async (key: string) => {
        window.localStorage.removeItem(key);
      },
    };
  }

  return {
    getItem: async (key: string) => {
      const SecureStore =
        // require évite de charger le module natif dans le bundle SSR web.
        require('expo-secure-store') as typeof import('expo-secure-store');
      return SecureStore.getItemAsync(key);
    },
    setItem: async (key: string, value: string) => {
      const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
      await SecureStore.setItemAsync(key, value);
    },
    removeItem: async (key: string) => {
      const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
      await SecureStore.deleteItemAsync(key);
    },
  };
}

/**
 * Stockage persist Zustand : AsyncStorage natif, localStorage web, mémoire partagée en SSR web.
 */
export function getZustandPersistStorage(): StateStorage {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') {
      if (ssrUiPersistSingleton === null) {
        ssrUiPersistSingleton = memoryKeyValueStorage();
      }
      return ssrUiPersistSingleton;
    }
    return {
      getItem: async (name: string) => window.localStorage.getItem(name),
      setItem: async (name: string, value: string) => {
        window.localStorage.setItem(name, value);
      },
      removeItem: async (name: string) => {
        window.localStorage.removeItem(name);
      },
    };
  }

  // Natif uniquement : pas d’import top-level pour limiter le graphe web SSR.
  const AsyncStorage = require('@react-native-async-storage/async-storage')
    .default as typeof import('@react-native-async-storage/async-storage').default;
  return AsyncStorage;
}
