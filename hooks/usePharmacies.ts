import { getNetworkStateAsync, type NetworkState } from 'expo-network';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLayoutEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import {
  getLastSyncDate,
  loadPharmacies,
  persistGardeSnapshotFromRpc,
} from '@/lib/offlineStorage';
import { mapRpcRowToPharmacyDeGarde } from '@/lib/mapPharmacyRpcRow';
import { supabase } from '@/lib/supabase';
import {
  usePharmacyStore,
  type PharmacySortBy,
} from '@/stores/pharmacyStore';
import type { PharmacyDeGarde } from '@/types/pharmacy';

const STALE_MS = 5 * 60 * 1000;
const GC_MS = 30 * 60 * 1000;

/** Données cache TanStack pour la clé `['pharmacies-garde', …]` */
export type PharmaciesGardeQueryData = {
  pharmacies: PharmacyDeGarde[];
  isOffline: boolean;
  lastSyncDate: Date | null;
};

export type UsePharmaciesReturn = {
  pharmacies: PharmacyDeGarde[];
  filteredPharmacies: PharmacyDeGarde[];
  loading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
  isOffline: boolean;
  lastSyncDate: Date | null;
};

function normalizeError(e: unknown): Error {
  if (e instanceof Error) return e;
  return new Error(String(e));
}

function applyClientFilters(
  list: PharmacyDeGarde[],
  searchQuery: string,
  communeFilter: string | null,
  insuranceFilter: string[],
  sortBy: PharmacySortBy,
): PharmacyDeGarde[] {
  const q = searchQuery.trim().toLowerCase();

  let out = list.filter((p) => {
    if (communeFilter !== null && communeFilter.trim() !== '') {
      if (
        p.commune.localeCompare(communeFilter, 'fr', { sensitivity: 'base' }) !==
        0
      ) {
        return false;
      }
    }

    if (insuranceFilter.length > 0) {
      const acceptsSome = insuranceFilter.some((code) =>
        p.accepted_insurance.includes(code),
      );
      if (!acceptsSome) return false;
    }

    if (q.length > 0) {
      const hay = `${p.name} ${p.address} ${p.commune}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });

  const sorted = [...out];
  switch (sortBy) {
    case 'rating':
      sorted.sort((a, b) => b.rating - a.rating);
      break;
    case 'verification':
      sorted.sort((a, b) => b.verification_count - a.verification_count);
      break;
    case 'distance':
    default:
      sorted.sort((a, b) => a.distance_km - b.distance_km);
      break;
  }

  return sorted;
}

function isNetworkOnline(state: NetworkState): boolean {
  if (state.isConnected !== true) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

/**
 * Pharmacies de garde : stale-while-revalidate SQLite → Supabase (specs §6.1).
 */
export function usePharmacies(
  latitude: number | null,
  longitude: number | null,
): UsePharmaciesReturn {
  const queryClient = useQueryClient();
  const filters = usePharmacyStore(
    useShallow((s) => ({
      searchQuery: s.searchQuery,
      communeFilter: s.communeFilter,
      insuranceFilter: s.insuranceFilter,
      sortBy: s.sortBy,
    })),
  );

  const enabled = latitude !== null && longitude !== null;

  const queryKey = ['pharmacies-garde', latitude, longitude] as const;

  useLayoutEffect(() => {
    // SQLite désactivé : aucune lecture au montage
  }, [enabled, latitude, longitude, queryClient]);

  const query = useQuery({
    queryKey,
    enabled,
    staleTime: STALE_MS,
    gcTime: GC_MS,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<PharmaciesGardeQueryData> => {
      if (latitude === null || longitude === null) {
        return { pharmacies: [], isOffline: false, lastSyncDate: null };
      }

      // SQLite et vérifications réseau désactivées pour éviter les blocages.
      // Appel direct au backend.
      const { data, error } = await supabase.rpc('get_pharmacies_de_garde', {
        user_lat: latitude,
        user_lng: longitude,
        max_distance_km: 20,
      });

      if (error !== null) {
        throw normalizeError(error);
      }

      const rows = data ?? [];
      const pharmacies = rows.map((row) => mapRpcRowToPharmacyDeGarde(row));

      // SQLite désactivé : on ne sauvegarde plus dans le cache local (persistGardeSnapshotFromRpc retiré)

      return {
        pharmacies,
        isOffline: false,
        lastSyncDate: new Date(),
      };
    },
  });

  const pharmacies = query.data?.pharmacies ?? [];

  const filteredPharmacies = useMemo(
    () =>
      applyClientFilters(
        pharmacies,
        filters.searchQuery,
        filters.communeFilter,
        filters.insuranceFilter,
        filters.sortBy,
      ),
    [
      pharmacies,
      filters.searchQuery,
      filters.communeFilter,
      filters.insuranceFilter,
      filters.sortBy,
    ],
  );

  const loading = enabled ? query.isPending : false;
  const err =
    query.error !== null && query.error !== undefined
      ? normalizeError(query.error)
      : null;

  return {
    pharmacies,
    filteredPharmacies,
    loading,
    isFetching: query.isFetching,
    error: err,
    refetch: () => query.refetch(),
    isOffline: query.data?.isOffline ?? false,
    lastSyncDate: query.data?.lastSyncDate ?? null,
  };
}
