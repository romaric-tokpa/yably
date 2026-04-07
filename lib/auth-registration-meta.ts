/**
 * Données d’inscription stockées dans `user.user_metadata` (signUp options.data).
 */

export type RegistrationMeta = {
  firstName: string;
  lastName: string;
  email: string;
};

export function registrationMetaFromUserMetadata(
  meta: Record<string, unknown> | undefined | null,
): RegistrationMeta {
  const rawFirst = meta?.first_name;
  const rawLast = meta?.last_name;
  const rawEmail = meta?.email;
  const firstName =
    typeof rawFirst === 'string' && rawFirst.trim().length > 0
      ? rawFirst.trim()
      : '';
  const lastName =
    typeof rawLast === 'string' && rawLast.trim().length > 0
      ? rawLast.trim()
      : '';
  const email =
    typeof rawEmail === 'string' && rawEmail.trim().length > 0
      ? rawEmail.trim()
      : '';
  return { firstName, lastName, email };
}
