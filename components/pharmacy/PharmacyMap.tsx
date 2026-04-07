import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Text, View } from 'react-native';
import MapView, { type Region, Marker } from 'react-native-maps';
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
import { YablyLogo } from '@/components/common/yablyLogo';
import type { ThemeColors } from '@/lib/constants';
import { formatDistance } from '@/lib/format';
import {
  getPharmacyVerificationTone,
  type PharmacyVerificationTone,
} from '@/lib/pharmacyVerificationTone';
import type { PharmacyDeGarde } from '@/types/pharmacy';

import type { PharmacyMapProps } from './pharmacy-map-props';

export type { PharmacyMapProps } from './pharmacy-map-props';

const ABIDJAN_CENTER: [number, number] = [-4.008, 5.36];
const DEFAULT_DELTA = 0.12;

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

/** [longitude, latitude] — aligné sur MapLibre historique. */
function computeInitialCenter(
  userLocation: { latitude: number; longitude: number } | null,
  pharmacies: PharmacyDeGarde[],
): [number, number] {
  if (pharmacies.length === 0) {
    return userLocation !== null
      ? [userLocation.longitude, userLocation.latitude]
      : ABIDJAN_CENTER;
  }
  const closest = nearestPharmacy(pharmacies);
  if (closest === null) return ABIDJAN_CENTER;
  if (userLocation !== null) {
    return [userLocation.longitude, userLocation.latitude];
  }
  return [closest.longitude, closest.latitude];
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

const TEARDROP = 36;

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

  const drop = (
    <View
      style={{
        width: TEARDROP,
        height: TEARDROP,
        borderTopLeftRadius: TEARDROP / 2,
        borderTopRightRadius: TEARDROP / 2,
        borderBottomLeftRadius: TEARDROP / 2,
        borderBottomRightRadius: 5,
        backgroundColor: color,
        transform: [{ rotate: '-45deg' }],
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: color,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 5,
      }}
    >
      <View style={{ transform: [{ rotate: '45deg' }], marginTop: -3 }}>
        <YablyLogo size={16} color="#FFFFFF" fillOpacity={0.3} strokeWidth={1.5} />
      </View>
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
      onPress={onVoirDetails}
      tracksViewChanges={false}
    >
      <View className="items-center" style={{ width: TEARDROP + 8 }}>
        <View accessibilityRole="button" accessibilityLabel={`Pharmacie ${pharmacy.name}`}>
          <PharmacyMapMarkerPin color={color} pulse={isPulse} />
        </View>
        <View
          className="mt-1 max-w-[140px] rounded-lg border px-2 py-1"
          style={{
            borderColor: pal.border,
            backgroundColor: pal.surface,
          }}
        >
          <Text className="text-[11px] font-bold" style={{ color: pal.text }} numberOfLines={1}>
            {pharmacy.name}
          </Text>
          <Text className="text-[10px] font-semibold" style={{ color: pal.primary }}>
            {formatDistance(pharmacy.distance_km)}
          </Text>
          <View
            className="mt-0.5 self-start rounded px-1.5 py-0.5"
            style={{
              borderWidth: 1,
              borderColor: color,
              backgroundColor:
                tone === 'verified'
                  ? pal.primaryMuted
                  : tone === 'closed'
                    ? pal.surfaceAlt
                    : pal.accentMuted,
            }}
          >
            <Text className="text-[9px] font-bold" style={{ color }}>
              {badgeLabel(tone)}
            </Text>
          </View>
        </View>
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
 * Carte native (react-native-maps) — compatible Expo Go ; fonds Apple/Google selon plateforme.
 */
export function PharmacyMap({
  pharmacies,
  userLocation,
  onMarkerPress,
}: PharmacyMapProps) {
  const { theme: pal } = useAppTheme();

  const initialRegion = useMemo((): Region => {
    const [lng, lat] = computeInitialCenter(userLocation, pharmacies);
    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: DEFAULT_DELTA,
      longitudeDelta: DEFAULT_DELTA,
    };
  }, [userLocation, pharmacies]);

  const mapRef = useRef<MapView>(null);
  const pharmaciesRef = useRef(pharmacies);
  const userRef = useRef(userLocation);
  pharmaciesRef.current = pharmacies;
  userRef.current = userLocation;

  const fitMapToMarkers = useCallback(() => {
    const map = mapRef.current;
    if (map === null) {
      return;
    }
    const ul = userRef.current;
    const list = pharmaciesRef.current;
    const coords: { latitude: number; longitude: number }[] = [];
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
      const c = coords[0] ?? { latitude: ABIDJAN_CENTER[1], longitude: ABIDJAN_CENTER[0] };
      map.animateToRegion(
        {
          latitude: c.latitude,
          longitude: c.longitude,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        },
        400,
      );
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
        mapPadding={{ top: 8, right: 0, bottom: 104, left: 0 }}
        onMapReady={() => {
          fitMapToMarkers();
        }}
        showsUserLocation={false}
        showsCompass={false}
      >
        {userLocation !== null ? (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View
              className="h-6 w-6 rounded-full border-[3px] border-white"
              style={{ backgroundColor: USER_MARKER_BLUE }}
            />
          </Marker>
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
