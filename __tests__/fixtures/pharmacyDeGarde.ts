import type { PharmacyDeGarde } from '@/types/pharmacy';

export function makePharmacy(
  override: Partial<PharmacyDeGarde> = {},
): PharmacyDeGarde {
  return {
    id: 'p1',
    name: 'Pharmacie Test',
    address: '12 rue des Lilas, Cocody',
    commune: 'Cocody',
    latitude: 5.36,
    longitude: -4.008,
    phone_primary: '+2250708091011',
    phone_secondary: null,
    pharmacist_name: 'M. Test',
    photo_url: null,
    accepted_insurance: ['MUGEFCI', 'NSIA', 'AUTRE'],
    accepted_mobile_money: [],
    rating: 4.5,
    review_count: 12,
    is_24h: true,
    distance_km: 2.3,
    duration_min: 8,
    verification_count: 3,
    last_verification: new Date('2025-01-01T12:00:00.000Z').toISOString(),
    last_verification_status: 'open',
    avg_wait_time: 12,
    ...override,
  };
}
