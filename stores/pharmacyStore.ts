import { create } from 'zustand';

/** Tri côté client (specs §4.1 + demande produit). */
export type PharmacySortBy = 'distance' | 'rating' | 'verification';

export type PharmacyState = {
  searchQuery: string;
  communeFilter: string | null;
  insuranceFilter: string[];
  sortBy: PharmacySortBy;
  setSearchQuery: (query: string) => void;
  setCommuneFilter: (commune: string | null) => void;
  setInsuranceFilter: (codes: string[]) => void;
  toggleInsuranceFilter: (code: string) => void;
  setSortBy: (sortBy: PharmacySortBy) => void;
  resetFilters: () => void;
};

const initialFilters = {
  searchQuery: '',
  communeFilter: null as string | null,
  insuranceFilter: [] as string[],
  sortBy: 'distance' as PharmacySortBy,
};

export const usePharmacyStore = create<PharmacyState>((set) => ({
  ...initialFilters,

  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
  },

  setCommuneFilter: (communeFilter) => {
    set({ communeFilter });
  },

  setInsuranceFilter: (insuranceFilter) => {
    set({ insuranceFilter });
  },

  toggleInsuranceFilter: (code) => {
    set((s) => ({
      insuranceFilter: s.insuranceFilter.includes(code)
        ? s.insuranceFilter.filter((c) => c !== code)
        : [...s.insuranceFilter, code],
    }));
  },

  setSortBy: (sortBy) => {
    set({ sortBy });
  },

  resetFilters: () => {
    set({ ...initialFilters });
  },
}));
