import type { LocationGeocodedAddress } from 'expo-location';

import { formatCoordsForDisplay, placeLineFromGeocode } from '@/lib/geo-display';

describe('geo-display', () => {
  it('formate les coordonnées en locale fr', () => {
    const s = formatCoordsForDisplay(5.356, -3.98765);
    expect(s).toMatch(/5/);
    expect(s).toMatch(/3/);
    expect(s).toContain('°');
  });

  it('compose une ligne de lieu depuis le géocodage', () => {
    const r: LocationGeocodedAddress = {
      city: 'Abidjan',
      district: 'Cocody',
      streetNumber: '12',
      street: 'Rue des Jardins',
      region: null,
      subregion: null,
      country: null,
      name: null,
      postalCode: null,
      isoCountryCode: null,
      timezone: null,
      formattedAddress: null,
    };
    expect(placeLineFromGeocode(r)).toBe('12 Rue des Jardins · Cocody');
  });
});
