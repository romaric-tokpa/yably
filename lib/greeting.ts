/**
 * Salutations accueil (heure locale appareil).
 * « Bonjour » : 5h–17h59 · « Bonsoir » : 18h–4h59.
 */

export function isEveningLocal(now: Date): boolean {
  const h = now.getHours();
  return h >= 18 || h < 5;
}

export function greetingWord(now: Date): 'Bonjour' | 'Bonsoir' {
  return isEveningLocal(now) ? 'Bonsoir' : 'Bonjour';
}

/** Premier mot du nom affiché (prénom attendu). */
export function firstNameFromDisplayName(
  displayName: string | null | undefined,
): string {
  if (displayName === null || displayName === undefined) {
    return '';
  }
  const trimmed = displayName.trim();
  if (trimmed.length === 0) {
    return '';
  }
  const parts = trimmed.split(/\s+/u);
  return parts[0] ?? '';
}

/** Reste du nom après le prénom (nom de famille composé pris en compte). */
export function lastNameFromDisplayName(
  displayName: string | null | undefined,
): string {
  if (displayName === null || displayName === undefined) {
    return '';
  }
  const trimmed = displayName.trim();
  if (trimmed.length === 0) {
    return '';
  }
  const parts = trimmed.split(/\s+/u);
  if (parts.length <= 1) {
    return '';
  }
  return parts.slice(1).join(' ');
}

/**
 * Ligne Explorer : « Bonjour Prénom » / « Bonsoir Prénom », ou seulement le mot de salutation.
 */
export function explorerGreetingLine(
  now: Date,
  displayName: string | null | undefined,
): string {
  const word = greetingWord(now);
  const first = firstNameFromDisplayName(displayName);
  if (first.length === 0) {
    return word;
  }
  return `${word} ${first}`;
}

/**
 * Ligne d’accueil : « Bonjour Prénom Nom » (nom complet issu de `display_name`),
 * ou seulement « Bonjour » / « Bonsoir » si le nom est vide.
 */
export function homeGreetingLine(
  now: Date,
  displayName: string | null | undefined,
): string {
  const word = greetingWord(now);
  const full = displayName?.trim() ?? '';
  if (full.length === 0) {
    return word;
  }
  return `${word} ${full}`;
}
