import { isVerificationWithinTwoHours } from '@/lib/format';

export type VerifiedBadgeTone = 'verified' | 'unverified' | 'closed';

/**
 * Détermine le ton du badge (specs §4.2 — vert / orange / rouge).
 */
export function resolveVerifiedBadgeTone(
  verificationCount: number,
  lastVerification: string | null,
  lastStatus: 'open' | 'closed' | null,
  now: Date = new Date(),
): VerifiedBadgeTone {
  if (lastStatus === 'closed') {
    return 'closed';
  }
  if (
    verificationCount > 0 &&
    lastStatus === 'open' &&
    isVerificationWithinTwoHours(lastVerification, now)
  ) {
    return 'verified';
  }
  return 'unverified';
}
