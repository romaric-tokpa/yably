export type VerificationStatus = 'open' | 'closed';

export interface Verification {
  id: string;
  pharmacy_id: string;
  user_id: string;
  status: VerificationStatus;
}
