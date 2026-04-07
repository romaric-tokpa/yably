import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useAppTheme } from '@/components/common/appThemeContext';
import { borderRadius as radii } from '@/lib/constants';

export type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Props Pressable si onPress est défini */
  pressableProps?: Omit<PressableProps, 'onPress' | 'children'>;
};

function cardElevation(nightMode: boolean): ViewStyle {
  if (Platform.OS === 'ios') {
    return {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: nightMode ? 0.4 : 0.08,
      shadowRadius: 10,
    };
  }
  return { elevation: nightMode ? 6 : 2 };
}

export function Card({
  children,
  onPress,
  style,
  pressableProps,
}: CardProps) {
  const { theme: t, nightMode } = useAppTheme();
  const baseStyle: ViewStyle = {
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: radii.card,
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
    ...cardElevation(nightMode),
  };

  if (onPress !== undefined) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          baseStyle,
          { opacity: pressed ? 0.96 : 1 },
          style,
        ]}
        {...pressableProps}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[baseStyle, style]}>{children}</View>;
}
