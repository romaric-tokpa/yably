import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/components/common/appThemeContext';
import { borderRadius as radii } from '@/lib/constants';
import type { ThemeColors } from '@/lib/constants';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  icon?: ReactNode;
};

type VariantStyle = { bg: string; fg: string; border: string };

function variantColors(
  variant: BadgeVariant,
  t: ThemeColors,
): VariantStyle {
  switch (variant) {
    case 'success':
      return { bg: t.primaryMuted, fg: t.success, border: t.success };
    case 'warning':
      return { bg: t.accentMuted, fg: t.unverified, border: t.accent };
    case 'danger':
      return { bg: t.surfaceAlt, fg: t.danger, border: t.danger };
    case 'info':
      return { bg: t.primaryMuted, fg: t.primary, border: t.primary };
    case 'neutral':
      return { bg: t.surfaceAlt, fg: t.textSoft, border: t.border };
  }
}

export function Badge({
  label,
  variant = 'neutral',
  icon,
}: BadgeProps) {
  const { theme: t } = useAppTheme();
  const c = variantColors(variant, t);

  return (
    <View
      className="flex-row items-center gap-1 self-start border px-2 py-0.5"
      style={{
        backgroundColor: c.bg,
        borderColor: c.border,
        borderRadius: radii.badge,
        borderWidth: 1,
      }}
    >
      {icon ?? null}
      <Text
        className="text-xs font-semibold"
        style={{ color: c.fg }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}
