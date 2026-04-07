import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useAppTheme } from '@/components/common/appThemeContext';
import { borderRadius as radii } from '@/lib/constants';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Props Pressable additionnelles (accessibilité, testID, etc.) */
  pressableProps?: Omit<PressableProps, 'onPress' | 'disabled' | 'children'>;
};

const onPrimaryLabel = '#FFFFFF';

const sizeClasses: Record<ButtonSize, { box: string; text: string }> = {
  sm: { box: 'py-2 px-3 min-h-[40px]', text: 'text-sm' },
  md: { box: 'py-3 px-4 min-h-[48px]', text: 'text-[15px]' },
  lg: { box: 'py-4 px-6 min-h-[56px]', text: 'text-base' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  pressableProps,
}: ButtonProps) {
  const { theme: t } = useAppTheme();
  const isDisabled = disabled || loading;
  const sizes = sizeClasses[size];

  const variantBoxStyle: ViewStyle = (() => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: t.primary, borderWidth: 0 };
      case 'secondary':
        return { backgroundColor: t.primaryMuted, borderWidth: 0 };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: t.primary,
        };
      case 'ghost':
        return { backgroundColor: 'transparent', borderWidth: 0 };
      case 'danger':
        return { backgroundColor: t.danger, borderWidth: 0 };
    }
  })();

  const labelColor =
    variant === 'primary' || variant === 'danger'
      ? onPrimaryLabel
      : t.primary;

  const spinnerColor =
    variant === 'outline' || variant === 'ghost' || variant === 'secondary'
      ? t.primary
      : onPrimaryLabel;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderRadius: radii.button,
          opacity: isDisabled ? 0.5 : pressed ? 0.92 : 1,
          alignSelf: 'flex-start',
        },
        variantBoxStyle,
        style,
      ]}
      {...pressableProps}
    >
      <View
        className={`flex-row items-center justify-center gap-2 ${sizes.box}`}
      >
        {loading ? (
          <ActivityIndicator color={spinnerColor} size="small" />
        ) : (
          icon ?? null
        )}
        <Text className={`font-semibold ${sizes.text}`} style={{ color: labelColor }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
