/**
 * Formatage affichage (specs §4 — distances, durées, temps relatif).
 */

const MIN_MS = 60_000;
const HOUR_MS = 60 * MIN_MS;
const TWO_H_MS = 2 * HOUR_MS;

export function formatDistance(km: number): string {
  return `${km.toFixed(1)} km`;
}

export function formatDuration(minutes: number): string {
  return `${minutes} min`;
}

/** Affichage lisible numéro profil (+225…), sans modifier les chiffres stockés. */
export function formatProfilePhone(phone: string | null): string {
  if (phone === null || phone.trim() === '') return '—';
  const digits = phone.replace(/\s/g, '');
  if (digits.startsWith('+225') && digits.length > 4) {
    const rest = digits.slice(4);
    const chunks = rest.match(/.{1,2}/g)?.join(' ') ?? rest;
    return `+225 ${chunks}`;
  }
  return phone;
}

/** Vérifie si la dernière vérification a moins de 2h (specs §4.2, §11). */
export function isVerificationWithinTwoHours(
  lastVerificationIso: string | null,
  now: Date = new Date(),
): boolean {
  if (lastVerificationIso === null) return false;
  const t = new Date(lastVerificationIso).getTime();
  if (Number.isNaN(t)) return false;
  return now.getTime() - t < TWO_H_MS;
}

/**
 * Libellé relatif pour une vérification (« il y a X min »).
 */
/**
 * Libellé court pour pilules (ex. « 45 min ») — design liste Yably.
 */
export function formatVerificationMinutesLabel(
  lastVerificationIso: string | null,
  now: Date = new Date(),
): string {
  if (lastVerificationIso === null) return '';
  const t = new Date(lastVerificationIso).getTime();
  if (Number.isNaN(t)) return '';
  const diffMs = now.getTime() - t;
  if (diffMs < 0) return "À l'instant";
  const diffMin = Math.floor(diffMs / MIN_MS);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD} j`;
}

export function formatVerificationRelative(
  lastVerificationIso: string | null,
  now: Date = new Date(),
): string {
  if (lastVerificationIso === null) return '';
  const t = new Date(lastVerificationIso).getTime();
  if (Number.isNaN(t)) return '';
  const diffMs = now.getTime() - t;
  if (diffMs < 0) return "à l'instant";
  const diffMin = Math.floor(diffMs / MIN_MS);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  return `il y a ${diffD} j`;
}
