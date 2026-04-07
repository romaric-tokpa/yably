/**
 * Types générés manuellement à partir de specs.md §2 (modèle Supabase PostgreSQL).
 * Colonnes DECIMAL : chaînes (représentation PostgREST / numeric).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { readonly [key: string]: Json | undefined }
  | readonly Json[];

/** Contrainte CHECK sur verifications.status */
export type VerificationRowStatus = 'open' | 'closed';

/** Contrainte CHECK sur profiles.role */
export type ProfileRowRole = 'user' | 'pharmacist' | 'admin';

/** Contrainte CHECK sur pharmacy_subscriptions.plan */
export type PharmacySubscriptionPlan = 'free' | 'premium' | 'boost';

export interface Database {
  public: {
    Tables: {
      pharmacies: {
        Row: {
          id: string;
          name: string;
          address: string;
          commune: string;
          city: string;
          latitude: string;
          longitude: string;
          phone_primary: string;
          phone_secondary: string | null;
          pharmacist_name: string | null;
          photo_url: string | null;
          accepted_insurance: string[];
          accepted_mobile_money: string[];
          rating: string;
          review_count: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          /** PostGIS geography(Point,4326) — rempli par trigger à partir de lat/lng. */
          geom?: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          address: string;
          commune: string;
          city?: string;
          latitude: string;
          longitude: string;
          phone_primary: string;
          phone_secondary?: string | null;
          pharmacist_name?: string | null;
          photo_url?: string | null;
          accepted_insurance?: string[];
          accepted_mobile_money?: string[];
          rating?: string;
          review_count?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          geom?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string;
          commune?: string;
          city?: string;
          latitude?: string;
          longitude?: string;
          phone_primary?: string;
          phone_secondary?: string | null;
          pharmacist_name?: string | null;
          photo_url?: string | null;
          accepted_insurance?: string[];
          accepted_mobile_money?: string[];
          rating?: string;
          review_count?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          geom?: string | null;
        };
        Relationships: [];
      };
      gardes: {
        Row: {
          id: string;
          pharmacy_id: string;
          start_date: string;
          end_date: string;
          is_24h: boolean;
          source: string;
          verified_by_admin: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          pharmacy_id: string;
          start_date: string;
          end_date: string;
          is_24h?: boolean;
          source: string;
          verified_by_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          pharmacy_id?: string;
          start_date?: string;
          end_date?: string;
          is_24h?: boolean;
          source?: string;
          verified_by_admin?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      verifications: {
        Row: {
          id: string;
          pharmacy_id: string;
          user_id: string;
          status: VerificationRowStatus;
          user_latitude: string | null;
          user_longitude: string | null;
          distance_to_pharmacy: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pharmacy_id: string;
          user_id: string;
          status: VerificationRowStatus;
          user_latitude?: string | null;
          user_longitude?: string | null;
          distance_to_pharmacy?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          pharmacy_id?: string;
          user_id?: string;
          status?: VerificationRowStatus;
          user_latitude?: string | null;
          user_longitude?: string | null;
          distance_to_pharmacy?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          phone: string | null;
          email: string | null;
          display_name: string | null;
          points: number;
          badge_level: number;
          role: ProfileRowRole;
          preferred_commune: string | null;
          avatar_url: string | null;
          notification_enabled: boolean;
          push_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          phone?: string | null;
          email?: string | null;
          display_name?: string | null;
          points?: number;
          badge_level?: number;
          role?: ProfileRowRole;
          preferred_commune?: string | null;
          avatar_url?: string | null;
          notification_enabled?: boolean;
          push_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phone?: string | null;
          email?: string | null;
          display_name?: string | null;
          points?: number;
          badge_level?: number;
          role?: ProfileRowRole;
          preferred_commune?: string | null;
          avatar_url?: string | null;
          notification_enabled?: boolean;
          push_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pharmacy_stats: {
        Row: {
          id: string;
          pharmacy_id: string;
          date: string;
          views: number;
          calls_clicked: number;
          directions_clicked: number;
          verifications_received: number;
        };
        Insert: {
          id?: string;
          pharmacy_id: string;
          date: string;
          views?: number;
          calls_clicked?: number;
          directions_clicked?: number;
          verifications_received?: number;
        };
        Update: {
          id?: string;
          pharmacy_id?: string;
          date?: string;
          views?: number;
          calls_clicked?: number;
          directions_clicked?: number;
          verifications_received?: number;
        };
        Relationships: [];
      };
      pharmacy_subscriptions: {
        Row: {
          id: string;
          pharmacy_id: string;
          plan: PharmacySubscriptionPlan;
          starts_at: string;
          ends_at: string;
          payment_reference: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          pharmacy_id: string;
          plan: PharmacySubscriptionPlan;
          starts_at: string;
          ends_at: string;
          payment_reference?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          pharmacy_id?: string;
          plan?: PharmacySubscriptionPlan;
          starts_at?: string;
          ends_at?: string;
          payment_reference?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      /** Specs §2.8 — RPC `get_pharmacies_de_garde` */
      get_pharmacies_de_garde: {
        Args: {
          user_lat: number;
          user_lng: number;
          max_distance_km?: number;
        };
        Returns: {
          id: string;
          name: string;
          address: string;
          commune: string;
          latitude: string;
          longitude: string;
          phone_primary: string;
          phone_secondary: string | null;
          pharmacist_name: string | null;
          photo_url: string | null;
          accepted_insurance: Json;
          accepted_mobile_money: Json;
          rating: string;
          review_count: number;
          is_24h: boolean;
          distance_km: string;
          duration_min: number;
          verification_count: number;
          last_verification: string | null;
          last_verification_status: string | null;
          avg_wait_time: number | null;
        }[];
      };
      /** Specs §2.8 — RPC `add_verification` (anti-fraude 500 m, rate limit 2 h) */
      add_verification: {
        Args: {
          p_pharmacy_id: string;
          p_user_id: string;
          p_status: string;
          p_user_lat: number;
          p_user_lng: number;
        };
        Returns: Json;
      };
    };
  };
}
