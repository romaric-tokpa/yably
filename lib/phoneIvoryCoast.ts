/**
 * Téléphone ivoirien — specs §11 point 8 : +225 XX XX XX XX XX (10 chiffres nationaux).
 */

export const CI_INTERNATIONAL_PREFIX = '+225';

const NATIONAL_LENGTH = 10;

export function phoneDigitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Regroupe par paires pour la saisie (ex. "0708091011" → "07 08 09 10 11"). */
export function formatNationalPairs(national10: string): string {
  if (national10.length === 0) return '';
  const pairs = national10.match(/.{1,2}/g);
  return pairs !== null ? pairs.join(' ') : national10;
}

/**
 * Construit l’E.164 à partir de la saisie (10 chiffres ou déjà préfixés 225…).
 * Retourne null si invalide.
 */
export function parseCiPhoneToE164(input: string): string | null {
  let digits = phoneDigitsOnly(input);
  if (digits.length >= 3 && digits.startsWith('225')) {
    digits = digits.slice(3);
  }
  if (digits.length !== NATIONAL_LENGTH) return null;
  return `${CI_INTERNATIONAL_PREFIX}${digits}`;
}

/** 10 chiffres nationaux pour préremplir un formulaire à partir du stockage E.164 / profil. */
export function national10FromProfilePhone(
  phone: string | null | undefined,
): string {
  if (phone === null || phone === undefined || phone.trim() === '') {
    return '';
  }
  let digits = phoneDigitsOnly(phone);
  if (digits.startsWith('225')) {
    digits = digits.slice(3);
  }
  return digits.length > NATIONAL_LENGTH
    ? digits.slice(0, NATIONAL_LENGTH)
    : digits;
}

/** Affichage complet « +225 XX XX XX XX XX » à partir d’un numéro déjà en E.164. */
export function formatCiFullDisplayFromE164(e164: string): string {
  let d = phoneDigitsOnly(e164);
  if (d.startsWith('225')) {
    d = d.slice(3);
  }
  if (d.length !== NATIONAL_LENGTH) {
    return e164.trim();
  }
  return `${CI_INTERNATIONAL_PREFIX} ${formatNationalPairs(d)}`;
}
