/**
 * Configuration Expo : plugins natifs + clés optionnelles.
 * Carte : MapLibre + MapTiler/OSM. iOS exige `bundleIdentifier` pour les config plugins.
 */

const appJson = require('./app.json');

const iosMapsKey = process.env.GOOGLE_MAPS_IOS_API_KEY ?? '';
const androidMapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? '';

/** Aligné sur `android.package` — obligatoire pour prebuild / MapLibre. */
const IOS_BUNDLE_ID = 'com.pharmaciegarde.app';

/** @type {import('@expo/config').ExpoConfig} */
const config = {
  ...appJson.expo,
  plugins: [
    ...(Array.isArray(appJson.expo.plugins) ? appJson.expo.plugins : []),
    '@maplibre/maplibre-react-native',
  ],
  ios: {
    ...appJson.expo.ios,
    bundleIdentifier: appJson.expo.ios?.bundleIdentifier ?? IOS_BUNDLE_ID,
    config: {
      ...(appJson.expo.ios?.config ?? {}),
      ...(iosMapsKey.length > 0 ? { googleMapsApiKey: iosMapsKey } : {}),
    },
  },
  android: {
    ...appJson.expo.android,
    config: {
      ...(appJson.expo.android?.config ?? {}),
      ...(androidMapsKey.length > 0
        ? {
            googleMaps: {
              apiKey: androidMapsKey,
            },
          }
        : {}),
    },
  },
};

module.exports = { expo: config };
