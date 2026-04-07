/** Types partagés cache hors-ligne (native SQLite / stub web). */

export type CachedPharmacyPayload = {
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
};

export type GardeCacheRow = {
  pharmacy_id: string;
  start_date: string;
  end_date: string;
  is_24h: number;
};
