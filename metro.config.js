const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// Sans ceci, le bundle SSR (expo-router/node/render.js) résout encore
// lib/offlineStorage → SQLite + .wasm indisponible sous Metro.
const offlineStorageNative = path.resolve(__dirname, 'lib/offlineStorage.native.ts');
const offlineStorageWeb = path.resolve(__dirname, 'lib/offlineStorage.web.ts');

const config = withNativeWind(getDefaultConfig(__dirname), {
  input: './global.css',
});

const previousResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const norm = moduleName.replace(/\\/g, '/');
  const rootNorm = __dirname.replace(/\\/g, '/');
  const isOfflineStorage =
    norm === `${rootNorm}/lib/offlineStorage` ||
    norm.endsWith('/lib/offlineStorage') ||
    norm.endsWith('/lib/offlineStorage.ts');

  if (isOfflineStorage) {
    const useSqlite = platform === 'ios' || platform === 'android';
    return {
      filePath: useSqlite ? offlineStorageNative : offlineStorageWeb,
      type: 'sourceFile',
    };
  }

  if (previousResolveRequest != null) {
    return previousResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
