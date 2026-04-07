import { memo, useEffect } from 'react';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { View } from 'react-native';

export type PulseDotProps = {
  color?: string;
  size?: number;
};

/** Pastille verte « live » (animation douce). */
export const PulseDot = memo(function PulseDot({
  color = '#0D7C5F',
  size = 8,
}: PulseDotProps) {
  const o = useSharedValue(1);
  const s = useSharedValue(1);

  useEffect(() => {
    o.value = 1;
    s.value = 1;
    o.value = withRepeat(
      withSequence(withTiming(0.35, { duration: 1000 }), withTiming(1, { duration: 1000 })),
      -1,
    );
    s.value = withRepeat(
      withSequence(withTiming(2, { duration: 1000 }), withTiming(1, { duration: 1000 })),
      -1,
    );
    return () => {
      cancelAnimation(o);
      cancelAnimation(s);
    };
  }, [o, s]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ scale: s.value }],
  }));

  const outer = Math.max(size * 2, 14);
  return (
    <View
      style={{
        width: outer,
        height: outer,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          ringStyle,
        ]}
      />
      <View
        style={{
          width: size - 2,
          height: size - 2,
          borderRadius: (size - 2) / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
});
