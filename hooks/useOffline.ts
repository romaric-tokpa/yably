import {
  NetworkStateType,
  useNetworkState,
  type NetworkState,
} from 'expo-network';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { getLastSyncDate, subscribeOfflineSync } from '@/lib/offlineStorage';

export type UseOfflineReturn = {
  isOffline: boolean;
  lastSyncDate: Date | null;
};

function computeIsOffline(state: NetworkState): boolean {
  if (state.isConnected === false) return true;
  if (state.type === NetworkStateType.NONE) return true;
  if (state.isInternetReachable === false) return true;
  return false;
}

/**
 * État réseau + dernière synchro cache locale (specs §6).
 */
export function useOffline(): UseOfflineReturn {
  const network = useNetworkState();
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);

  const refreshMeta = useCallback(() => {
    void getLastSyncDate().then(setLastSyncDate);
  }, []);

  useEffect(() => {
    refreshMeta();
  }, [refreshMeta]);

  useEffect(() => {
    return subscribeOfflineSync(refreshMeta);
  }, [refreshMeta]);

  const isOffline =
    Platform.OS === 'web'
      ? false
      : computeIsOffline({
          isConnected: network.isConnected,
          type: network.type,
          isInternetReachable: network.isInternetReachable,
        });

  return { isOffline, lastSyncDate };
}
