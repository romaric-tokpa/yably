import { isVerificationWithinTwoHours } from '@/lib/format';
import type { PharmacyDeGarde } from '@/types/pharmacy';

/** Ton affichage markers / compteur « ouvertes » (même logique que VerifiedBadge). */
export type PharmacyVerificationTone = 'verified' | 'unverified' | 'closed';

export function getPharmacyVerificationTone(
  p: PharmacyDeGarde,
): PharmacyVerificationTone {
  if (p.last_verification_status === 'closed') {
    return 'closed';
  }
  if (
    p.verification_count > 0 &&
    p.last_verification_status === 'open' &&
    isVerificationWithinTwoHours(p.last_verification)
  ) {
    return 'verified';
  }
  return 'unverified';
}
