import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionStatus } from 'expo-modules-core';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { formatCoordsForDisplay, placeLineFromGeocode } from '@/lib/geo-display';
import { logger } from '@/lib/logger';
import { reverseGeocodeLocationIq } from '@/lib/locationiq-geocode';

const STORAGE_KEY = '@pharmacie-garde/last-known-location';
const GPS_TIMEOUT_MS = 25_000;
const REVERSE_GEOCODE_DEBOUNCE_MS = 500;
const LAST_EXPO_MAX_AGE_MS = 15 * 60 * 1000;
const LAST_EXPO_MAX_AGE_STALE_MS = 7 * 24 * 60 * 60 * 1000;

export interface UseLocationReturn {
  location: { latitude: number; longitude: number } | null;
  loading: boolean;
  error: string | null;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
  refresh: () => Promise<void>;
  /** Lieu estimé (géocodage inverse), si disponible. */
  placeLabel: string | null;
  /** Coordonnées formatées ; affichage immédiat si pas encore de lieu. */
  coordsLabel: string | null;
}

type ResolveMode = 'initial' | 'manual' | 'background';

type StoredPayload = {
  latitude: number;
  longitude: number;
};

const ERR_PERMISSION =
  "L'accès à la localisation est refusé. Dernière position enregistrée utilisée si disponible.";
const ERR_SERVICES =
  "Les services de localisation sont désactivés sur l'appareil.";
const ERR_TIMEOUT =
  'Délai GPS dépassé. Réessayez ou déplacez-vous vers l’extérieur.';
const ERR_UNAVAILABLE = 'Position actuelle indisponible.';

function mapStatus(
  status: PermissionStatus,
): UseLocationReturn['permissionStatus'] {
  switch (status) {
    case PermissionStatus.GRANTED:
      return 'granted';
    case PermissionStatus.DENIED:
      return 'denied';
    default:
      return 'undetermined';
  }
}

async function loadStoredLocation(): Promise<StoredPayload | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as StoredPayload).latitude !== 'number' ||
      typeof (parsed as StoredPayload).longitude !== 'number' ||
      Number.isNaN((parsed as StoredPayload).latitude) ||
      Number.isNaN((parsed as StoredPayload).longitude)
    ) {
      return null;
    }
    return {
      latitude: (parsed as StoredPayload).latitude,
      longitude: (parsed as StoredPayload).longitude,
    };
  } catch {
    return null;
  }
}

async function persistLocation(
  latitude: number,
  longitude: number,
): Promise<void> {
  try {
    const payload: StoredPayload = { latitude, longitude };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* cache best-effort */
  }
}

function coordsFromLocationObject(
  loc: Location.LocationObject,
): StoredPayload {
  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
  };
}

async function getCurrentPositionWithTimeout(): Promise<Location.LocationObject> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('TIMEOUT'));
    }, GPS_TIMEOUT_MS);
    Location.getCurrentPositionAsync({
      accuracy: Location.LocationAccuracy.High,
    })
      .then((loc) => {
        clearTimeout(timer);
        resolve(loc);
      })
      .catch((e: unknown) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      });
  });
}

async function applyExpoCoords(
  loc: Location.LocationObject | null,
  apply: (c: StoredPayload | null) => void,
): Promise<StoredPayload | null> {
  if (loc === null) return null;
  const coords = coordsFromLocationObject(loc);
  apply(coords);
  await persistLocation(coords.latitude, coords.longitude);
  return coords;
}

/**
 * Géolocalisation : permission, cache AsyncStorage, position courante + suivi (watch) en temps réel.
 */
export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<UseLocationReturn['location']>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<UseLocationReturn['permissionStatus']>('undetermined');
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);

  const applyCoords = useCallback((c: StoredPayload | null) => {
    // Localisation par défaut forcée au Plateau (Abidjan) pour l'instant
    setLocation({ latitude: 5.31989700, longitude: -4.01676200 });
  }, []);

  const resolveLocation = useCallback(
    async (mode: ResolveMode) => {
      const showLoading = mode === 'initial' || mode === 'manual';
      const isBackground = mode === 'background';

      if (showLoading) setLoading(true);
      if (!isBackground) setError(null);

      try {
        let perm = await Location.getForegroundPermissionsAsync();
        if (perm.status === PermissionStatus.UNDETERMINED) {
          perm = await Location.requestForegroundPermissionsAsync();
        }

        setPermissionStatus(mapStatus(perm.status));

        const cached = await loadStoredLocation();

        if (perm.status !== PermissionStatus.GRANTED) {
          applyCoords(cached);
          if (!isBackground) {
            if (perm.status === PermissionStatus.DENIED) {
              setError(ERR_PERMISSION);
            } else if (cached === null) {
              setError(ERR_UNAVAILABLE);
            } else {
              setError(null);
            }
          }
          return;
        }

        const servicesOn = await Location.hasServicesEnabledAsync();
        if (!servicesOn) {
          const lastExpo = await Location.getLastKnownPositionAsync({
            maxAge: LAST_EXPO_MAX_AGE_STALE_MS,
          });
          let coords: StoredPayload | null =
            (await applyExpoCoords(lastExpo, applyCoords)) ?? null;
          if (coords === null && cached !== null) {
            coords = cached;
            applyCoords(cached);
          }
          if (coords === null) {
            applyCoords(null);
            if (!isBackground) {
              setError(ERR_SERVICES);
            }
          } else if (!isBackground) {
            setError(`${ERR_SERVICES} Position approximative affichée.`);
          } else {
            setError(null);
          }
          return;
        }

        try {
          const loc = await getCurrentPositionWithTimeout();
          const coords = await applyExpoCoords(loc, applyCoords);
          if (coords !== null) {
            setError(null);
          }
        } catch (e) {
          const isTimeout = e instanceof Error && e.message === 'TIMEOUT';
          const lastExpo = await Location.getLastKnownPositionAsync({
            maxAge: LAST_EXPO_MAX_AGE_MS,
          });
          let coords: StoredPayload | null =
            (await applyExpoCoords(lastExpo, applyCoords)) ?? null;
          if (coords === null && cached !== null) {
            coords = cached;
            applyCoords(cached);
          }

          if (coords === null) {
            applyCoords(null);
            if (!isBackground) {
              setError(isTimeout ? ERR_TIMEOUT : ERR_UNAVAILABLE);
            }
          } else {
            if (!isBackground) {
              setError(
                isTimeout
                  ? `${ERR_TIMEOUT} Une position récente est affichée.`
                  : `${ERR_UNAVAILABLE} Une position récente est affichée.`,
              );
            } else {
              setError(null);
            }
          }
        }
      } catch {
        const cached = await loadStoredLocation();
        applyCoords(cached);
        if (!isBackground) {
          setError(cached === null ? ERR_UNAVAILABLE : null);
        }
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [applyCoords],
  );

  const refresh = useCallback(async () => {
    await resolveLocation('manual');
  }, [resolveLocation]);

  useEffect(() => {
    void resolveLocation('initial');
  }, [resolveLocation]);

  /** Suivi GPS (mouvement / intervalle) pour garder la position à jour sans polling fixe. */
  useEffect(() => {
    if (permissionStatus !== 'granted') {
      return;
    }
    let cancelled = false;
    const subPromise = (async (): Promise<Location.LocationSubscription | null> => {
      const servicesOn = await Location.hasServicesEnabledAsync();
      if (cancelled || !servicesOn) {
        return null;
      }
      try {
        return await Location.watchPositionAsync(
          {
            accuracy: Location.LocationAccuracy.High,
            timeInterval: 4000,
            distanceInterval: 12,
          },
          (loc) => {
            void applyExpoCoords(loc, applyCoords);
          },
        );
      } catch (e) {
        logger.error('watchPositionAsync', e);
        return null;
      }
    })();

    return () => {
      cancelled = true;
      void subPromise.then((s) => {
        s?.remove();
      });
    };
  }, [permissionStatus, applyCoords]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        void resolveLocation('background');
      }
    });
    return () => sub.remove();
  }, [resolveLocation]);

  useEffect(() => {
    if (location === null) {
      setPlaceLabel(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const locIqKey =
            typeof process.env.EXPO_PUBLIC_LOCATIONIQ_API_KEY === 'string'
              ? process.env.EXPO_PUBLIC_LOCATIONIQ_API_KEY
              : '';
          if (locIqKey.trim().length > 0) {
            const fromIq = await reverseGeocodeLocationIq(
              location.latitude,
              location.longitude,
              locIqKey,
            );
            if (cancelled) {
              return;
            }
            if (fromIq !== null && fromIq.length > 0) {
              setPlaceLabel(fromIq);
              return;
            }
          }

          const results = await Location.reverseGeocodeAsync({
            latitude: location.latitude,
            longitude: location.longitude,
          });
          if (cancelled) {
            return;
          }
          const first = results[0];
          if (first === undefined) {
            setPlaceLabel(null);
            return;
          }
          const line = placeLineFromGeocode(first);
          setPlaceLabel(line.length > 0 ? line : null);
        } catch (e) {
          // Sur le simulateur, le rate limit (trop de requêtes) est fréquent. 
          // On ignore l'erreur en silencieux pour éviter l'écran rouge d'Expo.
          if (!cancelled) {
            setPlaceLabel(null);
          }
        }
      })();
    }, REVERSE_GEOCODE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [location?.latitude, location?.longitude]);

  const coordsLabel =
    location === null
      ? null
      : formatCoordsForDisplay(location.latitude, location.longitude);

  return {
    location,
    loading,
    error,
    permissionStatus,
    refresh,
    placeLabel,
    coordsLabel,
  };
}
