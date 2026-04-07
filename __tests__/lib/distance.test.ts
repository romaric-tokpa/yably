import {
  VERIFICATION_MAX_DISTANCE_M,
  haversineDistanceKm,
  haversineDistanceMeters,
} from '@/lib/distance';

describe('haversineDistanceMeters', () => {
  it('retourne 0 pour deux points identiques', () => {
    expect(haversineDistanceMeters(5.36, -4.008, 5.36, -4.008)).toBe(0);
  });

  it('est symétrique', () => {
    const a = haversineDistanceMeters(48.8566, 2.3522, 51.5074, -0.1278);
    const b = haversineDistanceMeters(51.5074, -0.1278, 48.8566, 2.3522);
    expect(a).toBeCloseTo(b, 5);
  });

  it('approxime Paris–Londres (~340 km)', () => {
    const m = haversineDistanceMeters(48.8566, 2.3522, 51.5074, -0.1278);
    expect(m / 1000).toBeGreaterThan(330);
    expect(m / 1000).toBeLessThan(360);
  });
});

describe('haversineDistanceKm', () => {
  it('convertit les mètres en km', () => {
    expect(haversineDistanceKm(0, 0, 0, 0)).toBe(0);
    const km = haversineDistanceKm(48.8566, 2.3522, 51.5074, -0.1278);
    expect(km).toBeCloseTo(haversineDistanceMeters(48.8566, 2.3522, 51.5074, -0.1278) / 1000, 10);
  });
});

describe('VERIFICATION_MAX_DISTANCE_M', () => {
  it('rayon anti-fraude specs §11 = 500 m', () => {
    expect(VERIFICATION_MAX_DISTANCE_M).toBe(500);
  });
});
