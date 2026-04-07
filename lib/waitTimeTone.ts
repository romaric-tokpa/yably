export type WaitTimeTone = 'short' | 'medium' | 'long';

/**
 * Seuils specs §4.2 : vert ≤10 min, orange ≤20 min, rouge &gt;20.
 */
export function toneForWaitMinutes(minutes: number): WaitTimeTone {
  if (minutes <= 10) return 'short';
  if (minutes <= 20) return 'medium';
  return 'long';
}
