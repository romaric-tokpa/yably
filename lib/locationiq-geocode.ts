/**
 * Géocodage inverse LocationIQ (optionnel) — quota gratuit pour MVP.
 * @see https://locationiq.com/docs
 */

import { logger } from '@/lib/logger';

export type LocationIqReverseResponse = {
  display_name?: string;
  address?: {
    road?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    state?: string;
    country?: string;
  };
};

function lineFromAddress(addr: LocationIqReverseResponse['address']): string {
  if (addr === undefined) {
    return '';
  }
  const street = addr.road?.trim() ?? '';
  const area =
    addr.suburb?.trim() ??
    addr.neighbourhood?.trim() ??
    addr.city?.trim() ??
    addr.town?.trim() ??
    '';
  const parts = [street, area].filter((s) => s.length > 0);
  const uniq = [...new Set(parts)];
  return uniq.slice(0, 2).join(' · ');
}

/**
 * Inverse : coordonnées → ligne courte pour affichage profil / explorer.
 */
export async function reverseGeocodeLocationIq(
  latitude: number,
  longitude: number,
  apiKey: string,
): Promise<string | null> {
  const key = apiKey.trim();
  if (key.length === 0) {
    return null;
  }
  const url = new URL('https://us1.locationiq.com/v1/reverse.php');
  url.searchParams.set('key', key);
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('format', 'json');
  url.searchParams.set('accept-language', 'fr');

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      logger.error('locationiq reverse', new Error(`HTTP ${String(res.status)}`));
      return null;
    }
    const data = (await res.json()) as LocationIqReverseResponse;
    const fromDisplay = data.display_name?.trim() ?? '';
    if (fromDisplay.length > 0 && fromDisplay.length <= 120) {
      return fromDisplay;
    }
    const fromAddr = lineFromAddress(data.address);
    return fromAddr.length > 0 ? fromAddr : null;
  } catch (e) {
    logger.error('locationiq reverse', e);
    return null;
  }
}
