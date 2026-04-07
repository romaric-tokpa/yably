/**
 * Edge Function — specs §7.1 `garde_change` + §10.2
 * Déclenchement : cron vendredi 18h (Dashboard Supabase → Edge Functions → Cron).
 *
 * Secrets optionnels :
 * - EXPO_ACCESS_TOKEN : jeton Expo pour quotas Push API (recommandé en prod).
 *
 * Envoie via Expo Push API le message :
 * « 🔄 Nouvelles pharmacies de garde dès demain ! Consultez la liste. »
 * Segmenté par `preferred_commune` dans le corps du message (specs §7.2).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const GARDE_BODY =
  '🔄 Nouvelles pharmacies de garde dès demain ! Consultez la liste.';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_MAX = 100;

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data: { type: string };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseUrl === undefined || serviceKey === undefined) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing Supabase env' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('push_token, preferred_commune, notification_enabled')
      .eq('notification_enabled', true)
      .not('push_token', 'is', null);

    if (error !== null) {
      throw error;
    }

    const messages: ExpoPushMessage[] = (profiles ?? [])
      .filter(
        (p): p is typeof p & { push_token: string } =>
          typeof p.push_token === 'string' && p.push_token.length > 0,
      )
      .map((p) => {
        const commune = p.preferred_commune;
        return {
          to: p.push_token,
          title: 'Pharmacies de garde',
          body:
            commune !== null && commune.length > 0
              ? `${GARDE_BODY} (${commune})`
              : GARDE_BODY,
          data: { type: 'garde_change' },
        };
      });

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          sent: 0,
          message: 'Aucun token enregistré',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    };
    if (expoAccessToken !== undefined && expoAccessToken.length > 0) {
      headers.Authorization = `Bearer ${expoAccessToken}`;
    }

    const expoResults: unknown[] = [];
    for (let i = 0; i < messages.length; i += BATCH_MAX) {
      const batch = messages.slice(i, i + BATCH_MAX);
      const pushRes = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(batch),
      });
      const pushJson: unknown = await pushRes.json().catch(() => ({}));
      expoResults.push({ status: pushRes.status, body: pushJson });
      if (!pushRes.ok) {
        return new Response(
          JSON.stringify({
            ok: false,
            sent: i,
            batchError: pushJson,
          }),
          {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sent: messages.length,
        batches: expoResults.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
