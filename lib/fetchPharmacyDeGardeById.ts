import { mapRpcRowToPharmacyDeGarde } from '@/lib/mapPharmacyRpcRow';
import { supabase } from '@/lib/supabase';
import type { PharmacyDeGarde } from '@/types/pharmacy';

import { haversineDistanceKm } from './distance';

const DETAIL_MAX_KM = 80;

/**
 * Charge une pharmacie « de garde » pour la fiche : RPC si position dispo, sinon requêtes tables.
 */
export async function fetchPharmacyDeGardeById(
  id: string,
  userLat: number | null,
  userLng: number | null,
): Promise<PharmacyDeGarde | null> {
  if (userLat !== null && userLng !== null) {
    const { data, error } = await supabase.rpc('get_pharmacies_de_garde', {
      user_lat: userLat,
      user_lng: userLng,
      max_distance_km: DETAIL_MAX_KM,
    });
    if (error === null && data !== null) {
      const row = data.find((r) => r.id === id);
      if (row !== undefined) {
        return mapRpcRowToPharmacyDeGarde(row);
      }
    }
  }

  const { data: p, error: phErr } = await supabase
    .from('pharmacies')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (phErr !== null || p === null) {
    return null;
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: g } = await supabase
    .from('gardes')
    .select('is_24h')
    .eq('pharmacy_id', id)
    .lte('start_date', today)
    .gte('end_date', today)
    .maybeSingle();

  const twoH = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const { count: vCount } = await supabase
    .from('verifications')
    .select('*', { count: 'exact', head: true })
    .eq('pharmacy_id', id)
    .gte('created_at', twoH);

  const { data: lastV } = await supabase
    .from('verifications')
    .select('status, created_at')
    .eq('pharmacy_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lat = parseFloat(p.latitude);
  const lng = parseFloat(p.longitude);
  let distance_km = 0;
  let duration_min = 0;
  if (
    userLat !== null &&
    userLng !== null &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng)
  ) {
    distance_km = haversineDistanceKm(userLat, userLng, lat, lng);
    duration_min = Math.round((distance_km / 20) * 60);
  }

  const st = lastV?.status;
  const lastStatus: 'open' | 'closed' | null =
    st === 'open' || st === 'closed' ? st : null;

  return {
    id: p.id,
    name: p.name,
    address: p.address,
    commune: p.commune,
    city: p.city,
    latitude: lat,
    longitude: lng,
    phone_primary: p.phone_primary,
    phone_secondary: p.phone_secondary ?? null,
    pharmacist_name: p.pharmacist_name ?? null,
    photo_url: p.photo_url ?? null,
    accepted_insurance: Array.isArray(p.accepted_insurance)
      ? p.accepted_insurance
      : [],
    accepted_mobile_money: Array.isArray(p.accepted_mobile_money)
      ? p.accepted_mobile_money
      : [],
    rating: parseFloat(p.rating) || 0,
    review_count: p.review_count,
    is_24h: g?.is_24h ?? false,
    distance_km,
    duration_min,
    verification_count: vCount ?? 0,
    last_verification: lastV?.created_at ?? null,
    last_verification_status: lastStatus,
    avg_wait_time: null,
  };
}
