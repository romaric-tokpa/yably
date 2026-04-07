import type { PharmacyDeGarde } from '@/types/pharmacy';

export type PharmacyMapProps = {
  pharmacies: PharmacyDeGarde[];
  userLocation: { latitude: number; longitude: number } | null;
  onMarkerPress: (pharmacy: PharmacyDeGarde) => void;
};
