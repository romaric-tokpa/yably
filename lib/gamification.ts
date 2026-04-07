/**
 * Gamification — specs §8.2 (badges par paliers de points).
 */

export type BadgeTier = {
  readonly level: number;
  readonly name: string;
  readonly minPoints: number;
};

/** Seuils inclusifs (dernier palier : 1000+). */
export const BADGE_TIERS: readonly BadgeTier[] = [
  { level: 1, name: 'Nouveau', minPoints: 0 },
  { level: 2, name: 'Contributeur', minPoints: 50 },
  { level: 3, name: 'Expert', minPoints: 200 },
  { level: 4, name: 'Champion', minPoints: 500 },
  { level: 5, name: 'Légende', minPoints: 1000 },
] as const;

/** Palier effectif pour un nombre de points (aligné sur la colonne badge_level 1–5). */
export function getBadgeTierForPoints(points: number): BadgeTier {
  let current: BadgeTier = BADGE_TIERS[0]!;
  for (const tier of BADGE_TIERS) {
    if (points >= tier.minPoints) {
      current = tier;
    }
  }
  return current;
}

/** Palier suivant, ou null si déjà au maximum. */
export function getNextBadgeTier(current: BadgeTier): BadgeTier | null {
  const idx = BADGE_TIERS.findIndex((t) => t.level === current.level);
  if (idx < 0) return null;
  return BADGE_TIERS[idx + 1] ?? null;
}

export type BadgeProgress = {
  current: BadgeTier;
  next: BadgeTier | null;
  /** Entre 0 et 1 vers le prochain badge (1 si niveau max). */
  progress: number;
};

/** Progression vers le prochain badge (barre UI). */
export function getProgressToNextBadge(points: number): BadgeProgress {
  const current = getBadgeTierForPoints(points);
  const next = getNextBadgeTier(current);
  if (next === null) {
    return { current, next: null, progress: 1 };
  }
  const span = next.minPoints - current.minPoints;
  const earnedInSpan = Math.max(0, points - current.minPoints);
  const progress =
    span <= 0 ? 1 : Math.min(1, Math.max(0, earnedInSpan / span));
  return { current, next, progress };
}
