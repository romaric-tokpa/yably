import { useEffect, useRef } from 'react';
import { Animated, type DimensionValue, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/components/common/appThemeContext';

export type SkeletonProps = {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
};

export function Skeleton({
  width,
  height,
  borderRadius = 8,
}: SkeletonProps) {
  const { theme: t } = useAppTheme();
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [pulse]);

  const containerStyle: ViewStyle = {
    width,
    height,
    borderRadius,
    backgroundColor: t.surfaceAlt,
    borderWidth: 1,
    borderColor: t.border,
    overflow: 'hidden',
  };

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[containerStyle, { opacity: pulse }]}
    />
  );
}
