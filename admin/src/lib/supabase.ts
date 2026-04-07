import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (
  import.meta.env.DEV &&
  (typeof url !== 'string' ||
    url.length === 0 ||
    typeof anon !== 'string' ||
    anon.length === 0)
) {
  console.warn(
    'Admin: définir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (.env)',
  );
}

/** En dev : log le corps des erreurs Auth (GoTrue renvoie souvent le détail dans le JSON). */
const debugAuthFetch: typeof fetch | undefined =
  import.meta.env.DEV === true
    ? async (input, init): Promise<Response> => {
        const res = await fetch(input, init);
        const u = typeof input === 'string' ? input : input.url;
        if (!res.ok && u.includes('/auth/v1/')) {
          try {
            const text = await res.clone().text();
            console.error('[Supabase Auth]', res.status, u, text);
          } catch {
            /* ignore */
          }
        }
        return res;
      }
    : undefined;

export const supabase = createClient<Database>(url ?? '', anon ?? '', {
  auth: {
    // Évite les avertissements « lock not released » avec React Strict Mode (double montage).
    lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> =>
      await fn(),
  },
  global: debugAuthFetch !== undefined ? { fetch: debugAuthFetch } : undefined,
});

/** Bucket Storage pour les photos de façade (à créer + politiques en lecture publique). */
export const PHARMACY_PHOTOS_BUCKET = 'pharmacy-photos';
