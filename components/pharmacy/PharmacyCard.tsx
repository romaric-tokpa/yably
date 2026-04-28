import { ChevronRight, Clock, MapPin, Star } from 'lucide-react-native';
import { memo } from 'react';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/components/common/appThemeContext';
import { Card } from '@/components/ui/Card';
import { borderRadius as radii, spacing } from '@/lib/constants';
import { fonts } from '@/lib/fonts';
import { formatDistance, formatDuration } from '@/lib/format';
import type { PharmacyDeGarde } from '@/types/pharmacy';

import { VerifiedBadge } from './VerifiedBadge';
import { WaitTimeChip } from './WaitTimeChip';

export type PharmacyCardProps = {
  pharmacy: PharmacyDeGarde;
  onPress: (pharmacy: PharmacyDeGarde) => void;
};

function distanceParts(km: number): { value: string; unit: string } {
  const formatted = formatDistance(km);
  const parts = formatted.split(' ');
  return { value: parts[0] ?? formatted, unit: parts[1] ?? 'km' };
}

/** Carte liste pharmacie de garde — design Yably (specs §4.2). */
export const PharmacyCard = memo(function PharmacyCard({
  pharmacy,
  onPress,
}: PharmacyCardProps) {
  const { theme: t } = useAppTheme();
  const ins = pharmacy.accepted_insurance;
  const shown = ins.slice(0, 2);
  const extra = ins.length - shown.length;
  const { value: distVal, unit: distUnit } = distanceParts(pharmacy.distance_km);

  const cardInner = (
    <View style={{ padding: 16, gap: 12 }}>
      {/* En-tête : Nom et Distance */}
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text
            className="text-[16px] leading-6 tracking-tight"
            style={{ color: t.text, fontFamily: fonts.outfitBold, fontWeight: '800' }}
            numberOfLines={2}
          >
            {pharmacy.name}
          </Text>
        </View>
        <View 
          className="items-center justify-center rounded-[12px] px-2.5 py-1" 
          style={{ backgroundColor: t.accentMuted }}
        >
          <Text style={{ fontFamily: fonts.outfitExtraBold, color: t.accent }}>
            <Text className="text-[18px]">{distVal}</Text>
            <Text
              className="text-[11px]"
              style={{ color: t.accent, fontFamily: fonts.outfitSemiBold }}
            >
              {' '}
              {distUnit}
            </Text>
          </Text>
        </View>
      </View>

      {/* Adresse et badges */}
      <View className="gap-3">
        <View className="flex-row items-start gap-2 pr-2">
          <MapPin size={15} color={t.textMuted} style={{ marginTop: 1 }} />
          <View className="flex-1">
            <Text
              className="text-[13px] leading-5"
              style={{ color: t.textSoft, fontFamily: fonts.outfitMedium }}
              numberOfLines={2}
            >
              {pharmacy.address}
            </Text>
            {pharmacy.commune.length > 0 || pharmacy.city.length > 0 ? (
              <Text
                className="mt-0.5 text-[11.5px]"
                style={{ color: t.textMuted, fontFamily: fonts.outfitRegular }}
                numberOfLines={1}
              >
                {[pharmacy.commune, pharmacy.city].filter((s) => s.length > 0).join(' · ')}
              </Text>
            ) : null}
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2.5">
          <WaitTimeChip minutes={pharmacy.avg_wait_time} dense />
          <VerifiedBadge
            verificationCount={pharmacy.verification_count}
            lastVerification={pharmacy.last_verification}
            lastStatus={pharmacy.last_verification_status}
            variant="compact"
          />
        </View>
      </View>

      {/* Pied de carte : Notes, Temps de trajet et Assurances */}
      <View
        className="mt-1 flex-row items-center justify-between border-t pt-3"
        style={{ borderTopColor: t.border }}
      >
        <View className="flex-row items-center gap-3.5">
          <View className="flex-row items-center gap-1">
            <Star size={14} color="#F59E0B" fill="#F59E0B" strokeWidth={0} />
            <Text
              className="text-[13px] tabular-nums"
              style={{ color: t.text, fontFamily: fonts.outfitBold }}
            >
              {pharmacy.rating.toFixed(1)}
            </Text>
            <Text
              className="text-[11px] tabular-nums"
              style={{ color: t.textMuted, fontFamily: fonts.outfitRegular }}
            >
              ({pharmacy.review_count})
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Clock size={12} color={t.textMuted} strokeWidth={2} />
            <Text
              className="text-[11px] tabular-nums"
              style={{ color: t.textMuted, fontFamily: fonts.outfitMedium }}
            >
              {formatDuration(pharmacy.duration_min)}
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap items-center justify-end gap-1.5 max-w-[45%]">
          {shown.map((code) => (
            <View
              key={code}
              className="border px-2 py-0.5"
              style={{
                borderColor: t.border,
                backgroundColor: t.surfaceAlt,
                borderRadius: 8,
              }}
            >
              <Text
                className="text-[10px]"
                style={{ color: t.textSoft, fontFamily: fonts.outfitSemiBold }}
                numberOfLines={1}
              >
                {code}
              </Text>
            </View>
          ))}
          {extra > 0 ? (
            <View
              className="px-1.5 py-0.5"
              style={{
                backgroundColor: t.accentMuted,
                borderRadius: 8,
              }}
            >
              <Text
                className="text-[10px]"
                style={{ color: t.accent, fontFamily: fonts.outfitBold }}
              >
                +{extra}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );

  return (
    <Card
      onPress={() => {
        onPress(pharmacy);
      }}
      pressableProps={{
        accessibilityLabel: `Ouvrir ${pharmacy.name}, ${formatDistance(pharmacy.distance_km)}`,
      }}
      style={{
        marginBottom: spacing.cardGap,
        borderRadius: radii.card,
        padding: 0,
        overflow: 'hidden',
        // Ombre légèrement plus prononcée pour un effet premium
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
      }}
    >
      <View className="absolute right-3 top-1/2 -translate-y-1/2 opacity-10">
        <ChevronRight size={20} color={t.text} />
      </View>
      {cardInner}
    </Card>
  );
});
