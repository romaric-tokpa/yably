import type { Database } from './supabase';

export type UserRole = Database['public']['Tables']['profiles']['Row']['role'];

/** Profil applicatif — table `profiles` (specs §2.4). */
export type UserProfile = Database['public']['Tables']['profiles']['Row'];
