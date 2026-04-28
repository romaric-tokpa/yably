/**
 * Données d’inscription stockées dans `user.user_metadata` (signUp options.data).
 */

export type RegistrationMeta = {
  firstName: string;
  lastName: string;
};

export function registrationMetaFromUserMetadata(
  meta: Record<string, unknown> | undefined | null,
): RegistrationMeta {
  const rawFirst = meta?.first_name;
  const rawLast = meta?.last_name;
  const firstName =
    typeof rawFirst === 'string' && rawFirst.trim().length > 0
      ? rawFirst.trim()
      : '';
  const lastName =
    typeof rawLast === 'string' && rawLast.trim().length > 0
      ? rawLast.trim()
      : '';
  return { firstName, lastName };
}
