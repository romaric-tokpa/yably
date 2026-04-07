/**
 * Style MapLibre raster : MapTiler si clé dispo, sinon tuiles OSM publiques (MVP / dev).
 * En production, préférer MapTiler (quota gratuit, rendu soigné, CGU claires).
 */

export type MapRasterStyle = Record<string, unknown>;

export function buildRasterMapStyle(maptilerApiKey: string | undefined): MapRasterStyle {
  const key = maptilerApiKey?.trim() ?? '';
  if (key.length > 0) {
    return {
      version: 8,
      sources: {
        basemap: {
          type: 'raster',
          tiles: [
            `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`,
          ],
          tileSize: 256,
          attribution:
            '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        },
      },
      layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
    };
  }

  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    },
    layers: [{ id: 'basemap', type: 'raster', source: 'osm' }],
  };
}
