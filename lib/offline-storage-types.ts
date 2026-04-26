/** Types partagés cache hors-ligne (native SQLite / stub web). */

export type CachedPharmacyPayload = {
  id: string;
  name: string;
  address: string;
  commune: string;
  /** Absent dans les caches créés avant l’alignement admin → app */
  city?: string;
  latitude: number;
  longitude: number;
  phone_primary: string;
  phone_secondary: string | null;
  pharmacist_name: string | null;
  photo_url: string | null;
  accepted_insurance: string[];
  accepted_mobile_money: string[];
  rating: number;
  review_count: number;
};

/** Normalise le JSON cache (rétro-compat sans `city`). */
export function parseCachedPharmacyPayload(json: string): CachedPharmacyPayload {
  const p = JSON.parse(json) as CachedPharmacyPayload;
  return {
    ...p,
    city: typeof p.city === 'string' ? p.city : '',
  };
}

export type GardeCacheRow = {
  pharmacy_id: string;
  start_date: string;
  end_date: string;
  is_24h: number;
};
