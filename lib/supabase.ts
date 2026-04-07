import { createClient } from '@supabase/supabase-js';

import { createSupabaseAuthStorage } from '@/lib/platformStorage';
import type { Database } from '@/types/supabase';

/**
 * URL et clé anon : définir EXPO_PUBLIC_SUPABASE_* dans `.env.local` (Expo les injecte au build).
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Stockage session Auth (specs §3.1) : SecureStore sur iOS/Android, localStorage sur web, mémoire en SSR.
 */
const authStorage = createSupabaseAuthStorage();

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
