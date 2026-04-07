import { useAuthStore } from '@/stores/authStore';

export type UseAuthSessionReturn = {
  userId: string | null;
  isLoading: boolean;
};

/**
 * Session Supabase : identité utilisateur (Zustand + initAuthStore).
 */
export function useAuthSession(): UseAuthSessionReturn {
  const userId = useAuthStore((s) => s.userId);
  const isLoading = useAuthStore((s) => s.sessionLoading);
  return { userId, isLoading };
}
