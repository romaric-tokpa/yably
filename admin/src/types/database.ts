/**
 * Sous-ensemble du schéma Supabase (specs §2) pour le typage client admin.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type VerificationStatus = 'open' | 'closed';
export type ProfileRole = 'user' | 'pharmacist' | 'admin';

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
        };
        Update: {
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
        };
        Update: {
          start_date?: string;
          end_date?: string;
          is_24h?: boolean;
          source?: string;
          verified_by_admin?: boolean;
        };
        Relationships: [];
      };
      verifications: {
        Row: {
          id: string;
          pharmacy_id: string;
          user_id: string;
          status: VerificationStatus;
          user_latitude: string | null;
          user_longitude: string | null;
          distance_to_pharmacy: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pharmacy_id: string;
          user_id: string;
          status: VerificationStatus;
          user_latitude?: string | null;
          user_longitude?: string | null;
          distance_to_pharmacy?: number | null;
        };
        Update: {
          status?: VerificationStatus;
          user_latitude?: string | null;
          user_longitude?: string | null;
          distance_to_pharmacy?: number | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          role: ProfileRole;
          updated_at: string;
          display_name: string | null;
          email: string | null;
        };
        Insert: {
          id: string;
          role?: ProfileRole;
          display_name?: string | null;
        };
        Update: {
          role?: ProfileRole;
          display_name?: string | null;
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
          views?: number;
          calls_clicked?: number;
          directions_clicked?: number;
          verifications_received?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Pharmacy = Database['public']['Tables']['pharmacies']['Row'];
export type PharmacyInsert = Database['public']['Tables']['pharmacies']['Insert'];
export type PharmacyUpdate = Database['public']['Tables']['pharmacies']['Update'];
export type Garde = Database['public']['Tables']['gardes']['Row'];
export type GardeInsert = Database['public']['Tables']['gardes']['Insert'];
export type PharmacyStat = Database['public']['Tables']['pharmacy_stats']['Row'];
