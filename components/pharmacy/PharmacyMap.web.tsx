import { Pressable, ScrollView, Text, View } from 'react-native';

import { useAppTheme } from '@/components/common/appThemeContext';
import type { ThemeColors } from '@/lib/constants';
import { formatDistance } from '@/lib/format';
import {
  getPharmacyVerificationTone,
  type PharmacyVerificationTone,
} from '@/lib/pharmacyVerificationTone';

import type { PharmacyMapProps } from './pharmacy-map-props';

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
    <View className="flex-row items-center gap-2">
      <View
        className="h-3.5 w-3.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <Text className="text-[14px] font-semibold" style={{ color: textColor }}>
        {label}
      </Text>
    </View>
  );
}

const USER_MARKER_BLUE = '#3B82F6';

/**
 * Fallback web : MapLibre est natif iOS/Android ; sur web, liste + légende uniquement.
 */
export function PharmacyMap({
  pharmacies,
  userLocation,
  onMarkerPress,
}: PharmacyMapProps) {
  const { theme: pal } = useAppTheme();

  return (
    <View className="min-h-[320px] flex-1 overflow-hidden">
      <View
        className="flex-1 gap-3 p-3"
        style={{ backgroundColor: pal.surfaceAlt }}
      >
        <View
          className="rounded-2xl border px-3 py-3"
          style={{ borderColor: pal.border, backgroundColor: pal.surface }}
        >
          <Text className="text-[15px] font-bold" style={{ color: pal.text }}>
            Carte non disponible sur le web
          </Text>
          <Text className="mt-2 text-[14px] leading-5" style={{ color: pal.textSoft }}>
            Pour la carte interactive, utilisez l’app sur iOS, Android ou un
            simulateur ({userLocation ? 'position actuelle prise en compte dans la liste.' : 'activez la localisation sur mobile.'})
          </Text>
        </View>

        {pharmacies.length > 0 ? (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 12, gap: 8 }}
            showsVerticalScrollIndicator
          >
            {pharmacies.map((p) => {
              const tone = getPharmacyVerificationTone(p);
              const color = markerHex(tone, pal);
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Ouvrir ${p.name}`}
                  onPress={() => {
                    onMarkerPress(p);
                  }}
                  className="rounded-2xl border px-3 py-3"
                  style={{
                    borderColor: pal.border,
                    backgroundColor: pal.surface,
                  }}
                >
                  <Text
                    className="text-[16px] font-bold"
                    style={{ color: pal.text }}
                  >
                    {p.name}
                  </Text>
                  <Text
                    className="mt-1 text-[14px] font-semibold"
                    style={{ color: pal.primary }}
                  >
                    {formatDistance(p.distance_km)}
                  </Text>
                  <View
                    className="mt-2 self-start rounded-lg border px-2 py-1"
                    style={{
                      borderColor: color,
                      backgroundColor:
                        tone === 'verified'
                          ? pal.primaryMuted
                          : tone === 'closed'
                            ? pal.surfaceAlt
                            : pal.accentMuted,
                    }}
                  >
                    <Text className="text-[13px] font-bold" style={{ color }}>
                      {badgeLabel(tone)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center py-8">
            <Text className="text-[14px]" style={{ color: pal.textSoft }}>
              Aucune pharmacie à afficher sur la carte.
            </Text>
          </View>
        )}
      </View>

      <View
        className="absolute bottom-3 left-3 right-3 flex-row flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl border px-3 py-2.5"
        style={{
          backgroundColor: pal.surface,
          borderColor: pal.border,
        }}
      >
        <LegendItem color={pal.verified} label="Vérifié" textColor={pal.text} />
        <LegendItem
          color={pal.unverified}
          label="Non vérifié"
          textColor={pal.text}
        />
        <LegendItem
          color={USER_MARKER_BLUE}
          label="Vous (mobile)"
          textColor={pal.text}
        />
      </View>
    </View>
  );
}
