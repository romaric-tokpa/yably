import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useVerification } from '@/hooks/useVerification';

const mockRpc = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { Wrapper };
}

describe('useVerification — anti-fraude client', () => {
  const pharmacyLoc = { latitude: 5.36, longitude: -4.008 };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-test-1' } },
      error: null,
    });
    mockRpc.mockResolvedValue({
      data: { success: true, points_earned: 5 },
      error: null,
    });
  });

  it('refuse si position utilisateur absente (pas d’appel RPC)', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useVerification(null), {
      wrapper: Wrapper,
    });

    await act(async () => {
      const ok = await result.current.verify('ph-1', 'open', pharmacyLoc);
      expect(ok).toBe(false);
    });

    expect(mockRpc).not.toHaveBeenCalled();
    expect(result.current.lastResult?.success).toBe(false);
    expect(result.current.lastResult?.error).toMatch(/localisation/i);
  });

  it('refuse si utilisateur à plus de 500 m (pas d’appel RPC)', async () => {
    const { Wrapper } = createWrapper();
    /** ~900 m au nord de la pharmacie (équateur ~111 m / 0,001°) */
    const tooFar = {
      latitude: pharmacyLoc.latitude + 0.009,
      longitude: pharmacyLoc.longitude,
    };

    const { result } = renderHook(() => useVerification(tooFar), {
      wrapper: Wrapper,
    });

    await act(async () => {
      const ok = await result.current.verify('ph-1', 'open', pharmacyLoc);
      expect(ok).toBe(false);
    });

    expect(mockRpc).not.toHaveBeenCalled();
    expect(result.current.lastResult?.success).toBe(false);
    expect(result.current.lastResult?.error).toMatch(/500/);
    expect(result.current.lastResult?.distance).toBeGreaterThan(500);
  });

  it('appelle add_verification si à portée', async () => {
    const { Wrapper } = createWrapper();
    const near = {
      latitude: pharmacyLoc.latitude + 0.0001,
      longitude: pharmacyLoc.longitude,
    };

    const { result } = renderHook(() => useVerification(near), {
      wrapper: Wrapper,
    });

    await act(async () => {
      const ok = await result.current.verify('ph-1', 'open', pharmacyLoc);
      expect(ok).toBe(true);
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'add_verification',
      expect.objectContaining({
        p_pharmacy_id: 'ph-1',
        p_user_id: 'user-test-1',
        p_status: 'open',
        p_user_lat: near.latitude,
        p_user_lng: near.longitude,
      }),
    );
    expect(result.current.lastResult?.success).toBe(true);
    expect(result.current.lastResult?.points_earned).toBe(5);
  });

  it('propage l’erreur RPC (ex. rate limit 2 h)', async () => {
    const { Wrapper } = createWrapper();
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Réessaie dans 2 h (limite anti-spam).' },
    });

    const near = {
      latitude: pharmacyLoc.latitude + 0.00005,
      longitude: pharmacyLoc.longitude,
    };

    const { result } = renderHook(() => useVerification(near), {
      wrapper: Wrapper,
    });

    await act(async () => {
      const ok = await result.current.verify('ph-1', 'closed', pharmacyLoc);
      expect(ok).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.lastResult?.success).toBe(false);
    });
    expect(result.current.lastResult?.error).toMatch(/2 h/);
  });
});
