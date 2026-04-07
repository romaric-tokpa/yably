/**
 * Validation mot de passe et messages d’erreur Auth (téléphone + mot de passe).
 */

const MIN_PASSWORD_LEN = 8;
const MAX_NAME_LEN = 40;
const MAX_DISPLAY_LEN = 100;

export type PasswordValidationError =
  | 'short'
  | 'mismatch'
  | 'weak';

export function validatePersonName(raw: string): string | null {
  const t = raw.trim();
  if (t.length === 0) {
    return null;
  }
  if (t.length > MAX_NAME_LEN) {
    return t.slice(0, MAX_NAME_LEN);
  }
  return t;
}

export function validateRegistrationPassword(
  password: string,
  confirm: string,
): PasswordValidationError | null {
  if (password.length < MIN_PASSWORD_LEN) {
    return 'short';
  }
  if (password !== confirm) {
    return 'mismatch';
  }
  const hasLetter = /[\p{L}]/u.test(password);
  const hasDigit = /\d/u.test(password);
  if (!hasLetter || !hasDigit) {
    return 'weak';
  }
  return null;
}

export function registrationPasswordErrorMessage(
  code: PasswordValidationError,
): string {
  switch (code) {
    case 'short':
      return `Le mot de passe doit contenir au moins ${String(MIN_PASSWORD_LEN)} caractères.`;
    case 'mismatch':
      return 'Les mots de passe ne correspondent pas.';
    case 'weak':
      return 'Le mot de passe doit inclure au moins une lettre et un chiffre.';
    default:
      return 'Mot de passe invalide.';
  }
}

/** Concatène prénom + nom pour `display_name` (max specs profil). */
export function buildDisplayName(firstName: string, lastName: string): string {
  const s = `${firstName.trim()} ${lastName.trim()}`.trim();
  if (s.length <= MAX_DISPLAY_LEN) {
    return s;
  }
  return s.slice(0, MAX_DISPLAY_LEN);
}

export function mapAuthPasswordErrorToUserMessage(rawMessage: string): string {
  const lower = rawMessage.toLowerCase();
  if (
    lower.includes('already registered') ||
    lower.includes('user already exists') ||
    lower.includes('already been registered')
  ) {
    return 'Ce numéro est déjà inscrit. Connectez-vous avec votre mot de passe.';
  }
  if (lower.includes('invalid login credentials')) {
    return 'Téléphone ou mot de passe incorrect.';
  }
  if (lower.includes('password')) {
    return rawMessage.length < 200 ? rawMessage : 'Mot de passe refusé par le serveur.';
  }
  if (lower.includes('unsupported phone provider')) {
    return (
      'Connexion par téléphone indisponible : activez le fournisseur Phone + SMS dans le tableau Supabase.'
    );
  }
  if (
    lower.includes('confirmation otp') ||
    lower.includes('twilio') ||
    lower.includes('sending confirmation')
  ) {
    return (
      'L’envoi du SMS de confirmation a échoué (fournisseur SMS / Twilio). Vérifiez la config Supabase ou désactivez la confirmation téléphone pour les inscriptions.'
    );
  }
  return rawMessage.length < 220 ? rawMessage : 'Une erreur est survenue. Réessayez.';
}
