import { create } from 'zustand';

/**
 * Why the paywall is showing:
 * - `trialEnded`: first open after the free Pro week ended (once per account per device)
 * - `limit`: today's free AI scans are used up
 */
export type PaywallReason = 'trialEnded' | 'limit';

interface PaywallState {
  reason: PaywallReason | null;
  /** True while the one-time health notice is on screen, so the two don't stack. */
  healthNoticeOpen: boolean;
  open: (reason: PaywallReason) => void;
  close: () => void;
  setHealthNoticeOpen: (open: boolean) => void;
}

export const usePaywallStore = create<PaywallState>((set) => ({
  reason: null,
  healthNoticeOpen: false,
  open: (reason) => set({ reason }),
  close: () => set({ reason: null }),
  setHealthNoticeOpen: (healthNoticeOpen) => set({ healthNoticeOpen }),
}));
