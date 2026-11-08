import { create } from 'zustand';

/**
 * 补记: which day and meal a food from the Log tab is saved under.
 * Not persisted: every visit starts at "now", and it resets after each save.
 */
export type MealSlot = 'now' | 'breakfast' | 'lunch' | 'snack' | 'dinner';

/** Clock time each meal is stored at (local). */
export const SLOT_TIME: Record<Exclude<MealSlot, 'now'>, [number, number]> = {
  breakfast: [8, 0],
  lunch: [12, 30],
  snack: [15, 30],
  dinner: [18, 30],
};

/** How many days back the picker offers (today + 6). */
export const BACKDATE_DAYS = 7;

interface WhenState {
  /** 0 = today, 1 = yesterday … */
  dayOffset: number;
  slot: MealSlot;
  setDay: (offset: number) => void;
  setSlot: (slot: MealSlot) => void;
  reset: () => void;
}

/** The meal that fits the current hour, used when moving to an earlier day. */
export function slotForHour(h: number): Exclude<MealSlot, 'now'> {
  if (h < 10.5) return 'breakfast';
  if (h < 14.5) return 'lunch';
  if (h < 17) return 'snack';
  return 'dinner';
}

export const useLogWhenStore = create<WhenState>((set, get) => ({
  dayOffset: 0,
  slot: 'now',
  setDay: (offset) => {
    const d = Math.min(BACKDATE_DAYS - 1, Math.max(0, Math.round(offset)));
    const now = new Date();
    let { slot } = get();
    // "Now" only exists today; an earlier day starts on the meal for this hour.
    if (d > 0 && slot === 'now') slot = slotForHour(now.getHours() + now.getMinutes() / 60);
    // Back to today: a meal that hasn't happened yet becomes "now".
    if (d === 0 && slot !== 'now' && slotDate(0, slot, now).getTime() > now.getTime()) slot = 'now';
    set({ dayOffset: d, slot });
  },
  setSlot: (slot) => set({ slot }),
  reset: () => set({ dayOffset: 0, slot: 'now' }),
}));

/** The local date/time a day + slot stands for. */
export function slotDate(dayOffset: number, slot: MealSlot, now = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - dayOffset);
  if (slot !== 'now') {
    const [h, m] = SLOT_TIME[slot];
    d.setHours(h, m, 0, 0);
  }
  return d.getTime() > now.getTime() ? now : d;
}

/** ISO time to send as eaten_at, or undefined for "now". */
export function eatenAtFor(dayOffset: number, slot: MealSlot): string | undefined {
  if (dayOffset === 0 && slot === 'now') return undefined;
  return slotDate(dayOffset, slot).toISOString();
}

/** True when the chosen time is not today, so today's totals don't change. */
export function isOtherDay(dayOffset: number): boolean {
  return dayOffset > 0;
}
