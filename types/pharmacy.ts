/**
 * Modèle affiché pour une pharmacie de garde (specs §4.1).
 */
export interface PharmacyDeGarde {
  id: string;
  name: string;
  address: string;
  commune: string;
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
  is_24h: boolean;
  distance_km: number;
  duration_min: number;
  verification_count: number;
  last_verification: string | null;
  last_verification_status: 'open' | 'closed' | null;
  avg_wait_time: number | null;
}
