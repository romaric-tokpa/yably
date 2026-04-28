import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import type { VerificationRowStatus } from '@/types/supabase';

import type { PharmaciesGardeQueryData } from './usePharmacies';

type VerificationInsertRow = {
  pharmacy_id: string;
  status: VerificationRowStatus;
  created_at: string;
};

/**
 * Abonnement Realtime sur `verifications` : met à jour le cache des listes « gardes » (specs §4.1).
 */
export function useRealtimeVerifications(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-verifications-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'verifications',
        },
        (payload) => {
          const row = payload.new as VerificationInsertRow;
          if (
            typeof row.pharmacy_id !== 'string' ||
            (row.status !== 'open' && row.status !== 'closed') ||
            typeof row.created_at !== 'string'
          ) {
            return;
          }

          queryClient.setQueriesData<PharmaciesGardeQueryData>(
            { queryKey: ['pharmacies-garde'] },
            (old) => {
              if (old === undefined) return old;

              return {
                ...old,
                pharmacies: old.pharmacies.map((p) => {
                  if (p.id !== row.pharmacy_id) return p;

                  const createdMs = new Date(row.created_at).getTime();
                  const prevMs =
                    p.last_verification === null
                      ? -1
                      : new Date(p.last_verification).getTime();
                  const isNewerOrEqual = createdMs >= prevMs;

                  return {
                    ...p,
                    verification_count: p.verification_count + 1,
                    last_verification: isNewerOrEqual
                      ? row.created_at
                      : p.last_verification,
                    last_verification_status: isNewerOrEqual
                      ? row.status
                      : p.last_verification_status,
                  };
                }),
              };
            },
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
