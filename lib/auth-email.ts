/**
 * Validation e-mail à l’inscription (téléphone + mot de passe ; e-mail en métadonnée / profil).
 */

const MAX_EMAIL_LEN = 254;

/** Format suffisant pour l’app (pas une validation RFC complète). */
const EMAIL_PATTERN =
  /^[a-z0-9._%+-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;

export function normalizeRegistrationEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Retourne l’e-mail normalisé ou `null` si vide ou invalide. */
export function validateRegistrationEmail(raw: string): string | null {
  const s = normalizeRegistrationEmail(raw);
  if (s.length === 0) {
    return null;
  }
  if (s.length > MAX_EMAIL_LEN) {
    return null;
  }
  if (!EMAIL_PATTERN.test(s)) {
    return null;
  }
  return s;
}

export function registrationEmailInvalidMessage(): string {
  return 'Saisissez une adresse e-mail valide.';
}
