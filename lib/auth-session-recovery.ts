/**
 * Session persistée (SecureStore) vs instance Supabase : après reset DB ou changement d’URL,
 * le refresh token côté client peut ne plus exister côté serveur.
 */

export function isStaleStoredSessionAuthMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('invalid refresh token') ||
    m.includes('refresh token not found') ||
    m.includes('refresh_token_not_found')
  );
}
