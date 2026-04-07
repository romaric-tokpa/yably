import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import {
  haversineDistanceMeters,
  VERIFICATION_MAX_DISTANCE_M,
} from '@/lib/distance';
import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/supabase';

/** Réponse métier `add_verification` (+5 ouvert, +3 fermé — specs §2.8, §8.1, §11). */
export type VerificationLastResult = {
  success: boolean;
  points_earned?: number;
  distance?: number;
  error?: string;
};

export type UseVerificationReturn = {
  verify: (
    pharmacyId: string,
    status: 'open' | 'closed',
    pharmacyLocation: { latitude: number; longitude: number },
  ) => Promise<boolean>;
  loading: boolean;
  error: Error | null;
  lastResult: VerificationLastResult | null;
};

function parseAddVerificationResult(data: Json | null): VerificationLastResult {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { success: false, error: 'Réponse invalide du serveur.' };
  }
  const o = data as Record<string, unknown>;
  const success = o.success === true;
  if (!success) {
    return {
      success: false,
      error:
        typeof o.error === 'string'
          ? o.error
          : 'Échec de la vérification.',
    };
  }
  return {
    success: true,
    points_earned:
      typeof o.points_earned === 'number' ? o.points_earned : undefined,
    distance: typeof o.distance === 'number' ? o.distance : undefined,
  };
}

/**
 * Vérification communautaire : anti-fraude 500 m (client + serveur), rate limit 2 h côté RPC (specs §11).
 */
export function useVerification(
  userLocation: { latitude: number; longitude: number } | null,
): UseVerificationReturn {
  const queryClient = useQueryClient();
  const [lastResult, setLastResult] = useState<VerificationLastResult | null>(
    null,
  );

  const { mutateAsync, reset, isPending, error: mutationError } = useMutation({
    mutationFn: async (vars: {
      pharmacyId: string;
      status: 'open' | 'closed';
      userLat: number;
      userLng: number;
    }) => {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError !== null || userData.user === null) {
        throw new Error('Authentification requise pour vérifier.');
      }

      const { data, error } = await supabase.rpc('add_verification', {
        p_pharmacy_id: vars.pharmacyId,
        p_user_id: userData.user.id,
        p_status: vars.status,
        p_user_lat: vars.userLat,
        p_user_lng: vars.userLng,
      });

      if (error !== null) {
        throw new Error(error.message);
      }

      const parsed = parseAddVerificationResult(data as Json);
      if (!parsed.success) {
        throw new Error(parsed.error ?? 'Échec de la vérification.');
      }
      return parsed;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pharmacies-garde'] });
      void queryClient.invalidateQueries({ queryKey: ['pharmacy-de-garde'] });
      void queryClient.invalidateQueries({ queryKey: ['verification-recent-self'] });
    },
  });

  const verify = useCallback(
    async (
      pharmacyId: string,
      status: 'open' | 'closed',
      pharmacyLocation: { latitude: number; longitude: number },
    ): Promise<boolean> => {
      reset();

      if (userLocation === null) {
        setLastResult({
          success: false,
          error:
            'Position indisponible. Activez la localisation pour vérifier.',
        });
        return false;
      }

      const meters = haversineDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        pharmacyLocation.latitude,
        pharmacyLocation.longitude,
      );

      if (meters > VERIFICATION_MAX_DISTANCE_M) {
        setLastResult({
          success: false,
          distance: Math.round(meters),
          error:
            'Vous devez être à proximité de la pharmacie (moins de 500 m).',
        });
        return false;
      }

      setLastResult(null);

      try {
        const result = await mutateAsync({
          pharmacyId,
          status,
          userLat: userLocation.latitude,
          userLng: userLocation.longitude,
        });
        setLastResult(result);
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erreur inattendue.';
        setLastResult({ success: false, error: msg });
        return false;
      }
    },
    [userLocation, mutateAsync, reset],
  );

  return {
    verify,
    loading: isPending,
    error: mutationError instanceof Error ? mutationError : null,
    lastResult,
  };
}
