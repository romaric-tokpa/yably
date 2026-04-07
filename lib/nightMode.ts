/**
 * Heure locale : mode nuit auto entre 20h et 6h (specs §4.1, §11).
 */
export function computeAutoNight(now: Date): boolean {
  const hour = now.getHours();
  return hour >= 20 || hour < 6;
}
