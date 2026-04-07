import type { LocationGeocodedAddress } from 'expo-location';

/** Affichage court des coordonnées (locale fr). */
export function formatCoordsForDisplay(latitude: number, longitude: number): string {
  return `${latitude.toLocaleString('fr-FR', {
    maximumFractionDigits: 5,
  })}°, ${longitude.toLocaleString('fr-FR', {
    maximumFractionDigits: 5,
  })}°`;
}

/**
 * Ligne lisible à partir du géocodage inverse (rue / quartier / ville).
 * Retourne une chaîne vide si aucune info exploitable.
 */
export function placeLineFromGeocode(r: LocationGeocodedAddress): string {
  const street =
    r.streetNumber !== null &&
    r.streetNumber !== '' &&
    r.street !== null &&
    r.street !== ''
      ? `${r.streetNumber} ${r.street}`.trim()
      : (r.street ?? '').trim();
  const rawParts = [street, r.district, r.subregion, r.city].filter(
    (x): x is string => typeof x === 'string' && x.trim().length > 0,
  );
  const uniq: string[] = [];
  for (const p of rawParts) {
    const n = p.trim();
    if (!uniq.includes(n)) {
      uniq.push(n);
    }
  }
  return uniq.slice(0, 2).join(' · ');
}
