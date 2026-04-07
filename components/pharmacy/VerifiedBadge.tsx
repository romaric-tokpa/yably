import { AlertCircle, CheckCircle } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/components/common/appThemeContext';
import { borderRadius as radii } from '@/lib/constants';
import {
  formatVerificationMinutesLabel,
  formatVerificationRelative,
} from '@/lib/format';
import { resolveVerifiedBadgeTone } from '@/lib/verifiedBadgeLogic';

export type VerifiedBadgeProps = {
  verificationCount: number;
  lastVerification: string | null;
  lastStatus: 'open' | 'closed' | null;
  /** Pilule compacte (cartes liste Yably). */
  variant?: 'default' | 'compact';
};

/**
 * Badge statut vérification (specs §4.2 — vert / orange / rouge).
 */
export function VerifiedBadge({
  verificationCount,
  lastVerification,
  lastStatus,
  variant = 'default',
}: VerifiedBadgeProps) {
  const { theme: t } = useAppTheme();
  const tone = resolveVerifiedBadgeTone(
    verificationCount,
    lastVerification,
    lastStatus,
  );

  const fg =
    tone === 'verified'
      ? t.verified
      : tone === 'closed'
        ? t.danger
        : t.unverified;

  const bg =
    tone === 'verified'
      ? t.primaryMuted
      : tone === 'closed'
        ? t.surfaceAlt
        : t.accentMuted;

  let label: string;
  if (tone === 'closed') {
    label = 'Signalé fermé';
  } else if (tone === 'verified') {
    if (variant === 'compact') {
      const short = formatVerificationMinutesLabel(lastVerification);
      label =
        short.length > 0
          ? `${verificationCount} vérif. • ${short}`
          : `${verificationCount} vérif.`;
    } else {
      const rel = formatVerificationRelative(lastVerification);
      label = `✅ Vérifié • ${verificationCount} pers • ${rel}`;
    }
  } else {
    label = 'Non vérifié';
  }

  const isCompact = variant === 'compact';
  const borderColorResolved =
    tone === 'closed' ? t.danger : tone === 'verified' ? t.verified : t.accent;

  return (
    <View
      className={`flex-row items-center self-start border ${isCompact ? 'gap-1 px-2.5 py-0.5' : 'px-2 py-1.5'}`}
      style={{
        backgroundColor: bg,
        borderColor: borderColorResolved,
        borderRadius: isCompact ? 20 : radii.badge,
        borderWidth: 1,
      }}
    >
      {isCompact ? (
        tone === 'verified' ? (
          <CheckCircle size={12} color={fg} strokeWidth={2.5} />
        ) : (
          <AlertCircle size={12} color={fg} strokeWidth={2.5} />
        )
      ) : null}
      <Text
        className={isCompact ? 'text-[10px] font-bold leading-4' : 'text-[14px] font-semibold leading-5'}
        style={{ color: fg }}
        numberOfLines={isCompact ? 1 : 2}
      >
        {label}
      </Text>
    </View>
  );
}
