import { buildRasterMapStyle } from '@/lib/maplibre-style';

describe('maplibre-style', () => {
  it('sans clé : source OSM', () => {
    const s = buildRasterMapStyle(undefined);
    expect(s.version).toBe(8);
    expect(JSON.stringify(s)).toContain('openstreetmap');
  });

  it('avec clé MapTiler : URL api.maptiler.com', () => {
    const s = buildRasterMapStyle('abc123');
    expect(JSON.stringify(s)).toContain('maptiler.com');
    expect(JSON.stringify(s)).toContain('abc123');
  });
});
