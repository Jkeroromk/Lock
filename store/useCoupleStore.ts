import { create } from 'zustand';
import { fetchCouple, type Couple } from '@/services/couple';

/** My couple link (or invite), shared by the couple space, the Social card and notifications. */
interface CoupleState {
  couple: Couple | null;
  loaded: boolean;
  error: boolean;
  refresh: () => Promise<void>;
  set: (couple: Couple | null) => void;
}

export const useCoupleStore = create<CoupleState>((set) => ({
  couple: null,
  loaded: false,
  error: false,
  refresh: async () => {
    try {
      set({ couple: await fetchCouple(), loaded: true, error: false });
    } catch {
      set({ loaded: true, error: true });
    }
  },
  set: (couple) => set({ couple }),
}));
