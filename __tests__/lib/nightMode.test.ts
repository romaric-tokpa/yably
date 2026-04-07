import { computeAutoNight } from '@/lib/nightMode';

describe('computeAutoNight', () => {
  it('false entre 6h inclus et 19h59', () => {
    expect(computeAutoNight(new Date('2025-01-15T06:00:00'))).toBe(false);
    expect(computeAutoNight(new Date('2025-01-15T12:00:00'))).toBe(false);
    expect(computeAutoNight(new Date('2025-01-15T19:59:59'))).toBe(false);
  });

  it('true à partir de 20h', () => {
    expect(computeAutoNight(new Date('2025-01-15T20:00:00'))).toBe(true);
    expect(computeAutoNight(new Date('2025-01-15T23:30:00'))).toBe(true);
  });

  it('true avant 6h', () => {
    expect(computeAutoNight(new Date('2025-01-15T05:59:59'))).toBe(true);
    expect(computeAutoNight(new Date('2025-01-15T00:00:00'))).toBe(true);
  });
});
