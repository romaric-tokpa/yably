import type { Database, Json } from '@/types/supabase';
import type { PharmacyDeGarde } from '@/types/pharmacy';

type RpcRow =
  Database['public']['Functions']['get_pharmacies_de_garde']['Returns'][number];

function toNum(value: string | number): number {
  if (typeof value === 'number') return value;
  const n = parseFloat(value);
  return Number.isNaN(n) ? 0 : n;
}

function jsonToStringArray(value: Json): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === 'string');
}

/**
 * Mappe une ligne retournée par `get_pharmacies_de_garde` vers `PharmacyDeGarde`.
 */
export function mapRpcRowToPharmacyDeGarde(row: RpcRow): PharmacyDeGarde {
  const status = row.last_verification_status;
  const normalizedStatus: 'open' | 'closed' | null =
    status === 'open' || status === 'closed' ? status : null;

  return {
    id: row.id,
    name: row.name,
    address: row.address,
    commune: row.commune,
    city: row.city,
    latitude: toNum(row.latitude),
    longitude: toNum(row.longitude),
    phone_primary: row.phone_primary,
    phone_secondary: row.phone_secondary ?? null,
    pharmacist_name: row.pharmacist_name ?? null,
    photo_url: row.photo_url ?? null,
    accepted_insurance: jsonToStringArray(row.accepted_insurance),
    accepted_mobile_money: jsonToStringArray(row.accepted_mobile_money),
    rating: toNum(row.rating),
    review_count: Number(row.review_count),
    is_24h: Boolean(row.is_24h),
    distance_km: toNum(row.distance_km),
    duration_min: Number(row.duration_min),
    verification_count: Number(row.verification_count),
    last_verification: row.last_verification ?? null,
    last_verification_status: normalizedStatus,
    avg_wait_time:
      row.avg_wait_time === null || row.avg_wait_time === undefined
        ? null
        : Number(row.avg_wait_time),
  };
}
