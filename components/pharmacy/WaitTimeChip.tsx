import { Clock } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/components/common/appThemeContext';
import { borderRadius as radii } from '@/lib/constants';
import { toneForWaitMinutes } from '@/lib/waitTimeTone';

export type WaitTimeChipProps = {
  minutes: number | null;
  /** Affichage réduit (cartes liste Yably). */
  dense?: boolean;
};

/**
 * Temps d’attente estimé : vert ≤10 min, orange ≤20 min, rouge &gt;20 (specs §4.2).
 */
export function WaitTimeChip({ minutes, dense = false }: WaitTimeChipProps) {
  const { theme: t } = useAppTheme();

  if (minutes === null || minutes < 0) {
    return null;
  }

  const tone = toneForWaitMinutes(minutes);
  const fg =
    tone === 'short' ? t.success : tone === 'medium' ? t.unverified : t.danger;
  const bg =
    tone === 'short'
      ? t.primaryMuted
      : tone === 'medium'
        ? t.accentMuted
        : t.surfaceAlt;
  const border =
    tone === 'short' ? t.success : tone === 'medium' ? t.accent : t.danger;

  return (
    <View
      testID="wait-time-chip"
      className={`flex-row items-center border ${dense ? 'gap-0.5 px-2.5 py-0.5' : 'gap-1 px-2 py-1.5'}`}
      style={{
        backgroundColor: bg,
        borderColor: border,
        borderRadius: dense ? 20 : radii.badge,
        borderWidth: 1,
        alignSelf: 'flex-start',
      }}
    >
      <Clock size={dense ? 12 : 14} color={fg} strokeWidth={dense ? 2.2 : 2.5} />
      <Text
        className={dense ? 'text-[10px] font-bold' : 'text-[14px] font-bold'}
        style={{ color: fg }}
      >
        ~{minutes} min
      </Text>
    </View>
  );
}
