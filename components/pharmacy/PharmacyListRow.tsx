import { type ReactNode } from 'react';
import Animated, { FadeInUp } from 'react-native-reanimated';

type PharmacyListRowProps = {
  index: number;
  children: ReactNode;
};

const STAGGER_MS = 52;
const MAX_DELAY_MS = 420;

/**
 * Entrée échelonnée des cartes liste (Reanimated).
 */
export function PharmacyListRow({ index, children }: PharmacyListRowProps) {
  const delay = Math.min(index * STAGGER_MS, MAX_DELAY_MS);
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(380).springify()}>
      {children}
    </Animated.View>
  );
}
