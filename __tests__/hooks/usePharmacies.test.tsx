import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { usePharmacies } from '@/hooks/usePharmacies';

const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
  }),
}));

jest.mock('@/lib/offlineStorage', () => ({
  loadPharmacies: jest.fn().mockResolvedValue([]),
  persistGardeSnapshotFromRpc: jest.fn().mockResolvedValue(undefined),
  getLastSyncDate: jest.fn().mockResolvedValue(null),
}));

const rpcRow = {
  id: 'p-garde',
  name: 'Pharmacie Garde Test',
  address: 'Boulevard test',
  commune: 'Plateau',
  city: 'Abidjan',
  latitude: '5.32',
  longitude: '-4.01',
  phone_primary: '+2250102030405',
  phone_secondary: null,
  pharmacist_name: null,
  photo_url: null,
  accepted_insurance: ['MUGEFCI'],
  accepted_mobile_money: [],
  rating: '4.0',
  review_count: 2,
  is_24h: true,
  distance_km: '1.2',
  duration_min: 6,
  verification_count: 1,
  last_verification: null,
  last_verification_status: null,
  avg_wait_time: null,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { Wrapper, queryClient };
}

describe('usePharmacies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRpc.mockResolvedValue({ data: [rpcRow], error: null });
    mockFrom.mockReturnValue({
      select: () => ({
        gte: () => ({
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });
  });

  it('ne charge pas sans coordonnées (loading false, liste vide)', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePharmacies(null, null), {
      wrapper: Wrapper,
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.pharmacies).toEqual([]);
  });

  it('appelle le RPC Supabase et retourne les pharmacies mappées', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePharmacies(5.32, -4.02), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.pharmacies).toHaveLength(1);
    expect(result.current.pharmacies[0]).toEqual(
      expect.objectContaining({
        id: 'p-garde',
        name: 'Pharmacie Garde Test',
        commune: 'Plateau',
        city: 'Abidjan',
        distance_km: 1.2,
      }),
    );
    expect(mockRpc).toHaveBeenCalledWith(
      'get_pharmacies_de_garde',
      expect.objectContaining({
        user_lat: 5.32,
        user_lng: -4.02,
        max_distance_km: 20,
      }),
    );
  });
});
