import { Clock, Star } from 'lucide-react-native';
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
    <View style={{ padding: 14, gap: 0 }}>
      <View className="mb-2 flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1 pr-1">
          <Text
            className="text-[14px] font-bold leading-5"
            style={{ color: t.text, fontFamily: fonts.outfitBold }}
            numberOfLines={2}
          >
            {pharmacy.name}
          </Text>
          <Text
            className="mt-0.5 text-[11px] leading-4"
            style={{ color: t.textSoft, fontFamily: fonts.outfitRegular }}
            numberOfLines={2}
          >
            {pharmacy.address}
          </Text>
          {pharmacy.commune.length > 0 || pharmacy.city.length > 0 ? (
            <Text
              className="mt-0.5 text-[10px] leading-4"
              style={{ color: t.textMuted, fontFamily: fonts.outfitRegular }}
              numberOfLines={1}
            >
              {[pharmacy.commune, pharmacy.city].filter((s) => s.length > 0).join(' · ')}
            </Text>
          ) : null}
        </View>
        <View className="items-end">
          <Text style={{ fontFamily: fonts.outfitExtraBold, color: t.accent }}>
            <Text className="text-[20px] leading-6">{distVal}</Text>
            <Text
              className="text-[11px] font-semibold"
              style={{ color: t.accent, fontFamily: fonts.outfitSemiBold }}
            >
              {' '}
              {distUnit}
            </Text>
          </Text>
          <View className="mt-0.5 flex-row items-center gap-0.5">
            <Clock size={11} color={t.textMuted} strokeWidth={2} />
            <Text
              className="text-[11px] tabular-nums"
              style={{ color: t.textMuted, fontFamily: fonts.outfitMedium }}
            >
              {formatDuration(pharmacy.duration_min)}
            </Text>
          </View>
        </View>
      </View>

      <View className="mb-2.5 flex-row flex-wrap gap-1.5">
        <VerifiedBadge
          verificationCount={pharmacy.verification_count}
          lastVerification={pharmacy.last_verification}
          lastStatus={pharmacy.last_verification_status}
          variant="compact"
        />
        <WaitTimeChip minutes={pharmacy.avg_wait_time} dense />
      </View>

      <View
        className="flex-row items-center justify-between border-t pt-2"
        style={{ borderTopColor: t.border }}
      >
        <View className="flex-row items-center gap-0.5">
          <Star size={13} color={t.accent} fill={t.accent} strokeWidth={0} />
          <Text
            className="text-xs font-bold tabular-nums"
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
        <View className="max-w-[55%] flex-row flex-wrap items-center justify-end gap-1">
          {shown.map((code) => (
            <View
              key={code}
              className="border px-1.5 py-0.5"
              style={{
                borderColor: t.border,
                backgroundColor: t.surfaceAlt,
                borderRadius: 6,
              }}
            >
              <Text
                className="text-[9px] font-semibold"
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
                borderRadius: 6,
              }}
            >
              <Text
                className="text-[9px] font-bold"
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
      }}
    >
      {cardInner}
    </Card>
  );
});
