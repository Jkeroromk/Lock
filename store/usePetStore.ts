import { create } from 'zustand';
import { useStore } from '@/store/useStore';
import { macroTargets } from '@/lib/macros';
import { getHealthData, isHealthConnected } from '@/services/health';
import {
  PetState, PetSyncInput, fetchPet, graduatePet, renamePet, setupPet, syncPet,
} from '@/services/pet';

/** Today's steps (when Health is connected) and the usual protein target, for the server to score the day. */
export async function petSyncInput(): Promise<PetSyncInput> {
  const { dailyCalorieGoal, user } = useStore.getState();
  const input: PetSyncInput = { proteinBase: macroTargets(dailyCalorieGoal || 2000, user).protein };
  try {
    if (await isHealthConnected()) {
      const { steps } = await getHealthData();
      if (steps > 0) input.steps = steps;
    }
  } catch {}
  return input;
}

interface PetStore {
  state: PetState | null;
  loading: boolean;
  error: boolean;
  /** Recount recent days on the server and refresh. */
  sync: () => Promise<void>;
  /** Refresh without recounting (cheap). */
  refresh: () => Promise<void>;
  setup: (body: { coachName: string; buddyKind: string; buddyName: string }) => Promise<void>;
  rename: (body: { coachName?: string; buddyName?: string }) => Promise<void>;
  graduate: (body: { nextKind: string; nextName: string }) => Promise<void>;
}

export const usePetStore = create<PetStore>((set) => ({
  state: null,
  loading: false,
  error: false,
  sync: async () => {
    set({ loading: true });
    try {
      const state = await syncPet(await petSyncInput());
      set({ state, error: false });
    } catch {
      set({ error: true });
    } finally {
      set({ loading: false });
    }
  },
  refresh: async () => {
    try {
      set({ state: await fetchPet(), error: false });
    } catch {
      set({ error: true });
    }
  },
  setup: async (body) => {
    const state = await setupPet({ ...body, ...(await petSyncInput()) });
    set({ state, error: false });
  },
  rename: async (body) => {
    set({ state: await renamePet(body) });
  },
  graduate: async (body) => {
    set({ state: await graduatePet(body) });
  },
}));
