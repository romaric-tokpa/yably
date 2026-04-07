/**
 * Configuration Expo : plugins natifs + clés optionnelles Google Maps.
 * Carte mobile : react-native-maps (Expo Go). Clés `GOOGLE_MAPS_IOS_API_KEY` / `GOOGLE_MAPS_ANDROID_API_KEY` pour prod.
 */

const appJson = require('./app.json');

const iosMapsKey = process.env.GOOGLE_MAPS_IOS_API_KEY ?? '';
const androidMapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? '';

/** @type {import('@expo/config').ExpoConfig} */
const config = {
  ...appJson.expo,
  plugins: [...(Array.isArray(appJson.expo.plugins) ? appJson.expo.plugins : [])],
  ios: {
    ...appJson.expo.ios,
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
