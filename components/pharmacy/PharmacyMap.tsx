import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Hospital } from 'lucide-react-native';
import MapView, { Marker, Circle, type Region } from 'react-native-maps';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/components/common/appThemeContext';
import { GlassPanel } from '@/components/common/glassPanel';

import type { ThemeColors } from '@/lib/constants';
import { haversineDistanceMeters } from '@/lib/distance';
import { formatDistance } from '@/lib/format';
import {
  getPharmacyVerificationTone,
  type PharmacyVerificationTone,
} from '@/lib/pharmacyVerificationTone';
import type { PharmacyDeGarde } from '@/types/pharmacy';

import type { PharmacyMapProps } from './pharmacy-map-props';

export type { PharmacyMapProps } from './pharmacy-map-props';

/** Expo Go : react-native-maps (Apple/Google selon plateforme). MapLibre = dev build uniquement. */
const ABIDJAN_REGION: Region = {
  latitude: 5.36,
  longitude: -4.008,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

const MAP_MARGIN_M = 2000;
const USER_MARKER_BLUE = '#3B82F6';

const FIT_PADDING = { top: 88, right: 52, bottom: 128, left: 52 };

function markerHex(tone: PharmacyVerificationTone, pal: ThemeColors): string {
  switch (tone) {
    case 'verified':
      return pal.verified;
    case 'closed':
      return pal.danger;
    default:
      return pal.unverified;
  }
}

function nearestPharmacy(list: PharmacyDeGarde[]): PharmacyDeGarde | null {
  if (list.length === 0) return null;
  return list.reduce((a, b) => (a.distance_km <= b.distance_km ? a : b));
}

function computeInitialRegion(
  userLocation: { latitude: number; longitude: number } | null,
  pharmacies: PharmacyDeGarde[],
): Region {
  if (pharmacies.length === 0) {
    if (userLocation !== null) {
      const d = (MAP_MARGIN_M * 2.5) / 111_320;
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: Math.max(d, 0.025),
        longitudeDelta: Math.max(
          d / Math.cos((userLocation.latitude * Math.PI) / 180),
          0.025,
        ),
      };
    }
    return ABIDJAN_REGION;
  }

  const closest = nearestPharmacy(pharmacies);
  if (closest === null) return ABIDJAN_REGION;

  const center =
    userLocation !== null
      ? userLocation
      : { latitude: closest.latitude, longitude: closest.longitude };

  let radiusM = MAP_MARGIN_M;
  if (userLocation !== null) {
    const dM = haversineDistanceMeters(
      userLocation.latitude,
      userLocation.longitude,
      closest.latitude,
      closest.longitude,
    );
    radiusM = dM + MAP_MARGIN_M;
  } else {
    radiusM = Math.max(closest.distance_km * 1000, 150) + MAP_MARGIN_M;
  }

  const diameterM = Math.max(radiusM * 2, 4_000);
  const latDelta = Math.max(diameterM / 111_320, 0.012);
  const cosLat = Math.cos((center.latitude * Math.PI) / 180);
  const lngDelta = Math.max(latDelta / Math.max(cosLat, 0.25), 0.012);

  return {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

function badgeLabel(tone: PharmacyVerificationTone): string {
  switch (tone) {
    case 'verified':
      return 'Vérifié';
    case 'closed':
      return 'Signalé fermé';
    default:
      return 'Non vérifié';
  }
}

type PharmacyMapMarkerPinProps = {
  color: string;
  pulse: boolean;
};

function PharmacyMapMarkerPin({ color, pulse }: PharmacyMapMarkerPinProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!pulse) {
      cancelAnimation(scale);
      scale.value = 1;
      return;
    }
    cancelAnimation(scale);
    scale.value = 1;
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(scale);
    };
  }, [pulse, scale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const CIRCLE_SIZE = 32;

  const drop = (
    <View
      style={{
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_SIZE / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        shadowColor: color,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 6,
      }}
    >
      <Hospital size={18} color="#FFFFFF" strokeWidth={2.5} />
    </View>
  );

  if (!pulse) {
    return (
      <View style={{ alignItems: 'center', paddingBottom: 4 }} pointerEvents="box-none">
        {drop}
      </View>
    );
  }

  return (
    <Animated.View
      style={[{ alignItems: 'center', paddingBottom: 4 }, pulseStyle]}
      pointerEvents="box-none"
    >
      {drop}
    </Animated.View>
  );
}

type PharmacyMarkerOnMapProps = {
  pharmacy: PharmacyDeGarde;
  pal: ThemeColors;
  onVoirDetails: () => void;
};

function PharmacyMarkerOnMap({ pharmacy, pal, onVoirDetails }: PharmacyMarkerOnMapProps) {
  const tone = getPharmacyVerificationTone(pharmacy);
  const color = markerHex(tone, pal);
  const isPulse = tone === 'verified';

  return (
    <Marker
      coordinate={{ latitude: pharmacy.latitude, longitude: pharmacy.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={Platform.OS === 'android'}
      onPress={onVoirDetails}
    >
      <View className="items-center" style={{ width: 40 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ouvrir ${pharmacy.name}`}
          onPress={onVoirDetails}
          hitSlop={8}
        >
          <PharmacyMapMarkerPin color={color} pulse={isPulse} />
        </Pressable>
      </View>
    </Marker>
  );
}

function LegendItem({
  color,
  label,
  textColor,
}: {
  color: string;
  label: string;
  textColor: string;
}) {
  return (
    <View className="flex-row items-center gap-1">
      <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-[10px] font-semibold" style={{ color: textColor }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Carte interactive — react-native-maps (compatible Expo Go).
 * Pour MapLibre + tuiles MapTiler personnalisées, utiliser un development build.
 */
export function PharmacyMap({
  pharmacies,
  userLocation,
  onMarkerPress,
}: PharmacyMapProps) {
  const { theme: pal, nightMode } = useAppTheme();
  const mapRef = useRef<MapView | null>(null);

  const initialRegion = useMemo(
    () => computeInitialRegion(userLocation, pharmacies),
    [userLocation, pharmacies],
  );

  const pharmaciesRef = useRef(pharmacies);
  const userRef = useRef(userLocation);
  pharmaciesRef.current = pharmacies;
  userRef.current = userLocation;

  const fitMapToMarkers = useCallback(() => {
    const map = mapRef.current;
    if (map === null) return;

    const coords: { latitude: number; longitude: number }[] = [];
    const ul = userRef.current;
    const list = pharmaciesRef.current;
    if (ul !== null) {
      coords.push({ latitude: ul.latitude, longitude: ul.longitude });
    }
    for (const p of list) {
      coords.push({ latitude: p.latitude, longitude: p.longitude });
    }

    if (coords.length === 0) {
      return;
    }

    if (coords.length === 1) {
      const c = coords[0]!;
      map.animateToRegion({
        latitude: c.latitude,
        longitude: c.longitude,
        latitudeDelta: 0.045,
        longitudeDelta:
          0.045 / Math.cos((c.latitude * Math.PI) / 180),
      });
      return;
    }

    map.fitToCoordinates(coords, {
      edgePadding: FIT_PADDING,
      animated: true,
    });
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      fitMapToMarkers();
    });
    return () => cancelAnimationFrame(id);
  }, [userLocation, pharmacies, fitMapToMarkers]);

  return (
    <View className="min-h-[320px] flex-1 overflow-hidden">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        mapType="standard"
        onMapReady={() => {
          fitMapToMarkers();
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {userLocation !== null ? (
          <>
            <Circle
              center={{
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
              }}
              radius={20000}
              fillColor={nightMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.08)'}
              strokeColor="rgba(59, 130, 246, 0.4)"
              strokeWidth={1}
            />
            <Marker
              coordinate={{
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={Platform.OS === 'android'}
            >
              <View
                className="h-6 w-6 rounded-full border-[3px] border-white"
                style={{ backgroundColor: USER_MARKER_BLUE }}
              />
            </Marker>
          </>
        ) : null}

        {pharmacies.map((p) => (
          <PharmacyMarkerOnMap
            key={p.id}
            pharmacy={p}
            pal={pal}
            onVoirDetails={() => {
              onMarkerPress(p);
            }}
          />
        ))}
      </MapView>

      <GlassPanel
        borderRadius={14}
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          right: 12,
        }}
        intensity={28}
        contentStyle={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <LegendItem color={pal.verified} label="Vérifié" textColor={pal.textSoft} />
        <LegendItem color={pal.unverified} label="Non vérifié" textColor={pal.textSoft} />
        <LegendItem color={USER_MARKER_BLUE} label="Vous" textColor={pal.textSoft} />
      </GlassPanel>
    </View>
  );
}
