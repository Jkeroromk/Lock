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

/** How many day chips the picker shows (today + 6). */
export const BACKDATE_DAYS = 7;
/** How far back 补记 can go at all (the server accepts 30 days; from the calendar or a photo's date). */
export const MAX_BACKDATE_DAYS = 30;

interface WhenState {
  /** 0 = today, 1 = yesterday … */
  dayOffset: number;
  slot: MealSlot;
  /** Exact time (ISO), e.g. when a photo was taken; wins over the slot. Cleared by picking a day or meal. */
  at: string | null;
  setDay: (offset: number) => void;
  setSlot: (slot: MealSlot) => void;
  /** Use an exact past time (a photo's). Ignored outside the 补记 window. */
  setAt: (iso: string) => void;
  reset: () => void;
}

/** The meal that fits the current hour, used when moving to an earlier day. */
export function slotForHour(h: number): Exclude<MealSlot, 'now'> {
  if (h < 10.5) return 'breakfast';
  if (h < 14.5) return 'lunch';
  if (h < 17) return 'snack';
  return 'dinner';
}

/** Whole local days between `d` and today (0 = today). */
export function daysAgo(d: Date, now = new Date()): number {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime();
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime();
  return Math.round((a - b) / 86_400_000);
}

export const useLogWhenStore = create<WhenState>((set, get) => ({
  dayOffset: 0,
  slot: 'now',
  at: null,
  setAt: (iso) => {
    const d = new Date(iso);
    const now = new Date();
    if (Number.isNaN(d.getTime()) || d.getTime() > now.getTime()) return;
    const off = daysAgo(d, now);
    if (off >= MAX_BACKDATE_DAYS) return;
    set({ at: d.toISOString(), dayOffset: off, slot: slotForHour(d.getHours() + d.getMinutes() / 60) });
  },
  setDay: (offset) => {
    const d = Math.min(MAX_BACKDATE_DAYS - 1, Math.max(0, Math.round(offset)));
    const now = new Date();
    let { slot } = get();
    // "Now" only exists today; an earlier day starts on the meal for this hour.
    if (d > 0 && slot === 'now') slot = slotForHour(now.getHours() + now.getMinutes() / 60);
    // Back to today: a meal that hasn't happened yet becomes "now".
    if (d === 0 && slot !== 'now' && slotDate(0, slot, now).getTime() > now.getTime()) slot = 'now';
    set({ dayOffset: d, slot, at: null });
  },
  setSlot: (slot) => set({ slot, at: null }),
  reset: () => set({ dayOffset: 0, slot: 'now', at: null }),
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

/** ISO time to send as eaten_at, or undefined for "now". `at` (a photo's time) wins. */
export function eatenAtFor(dayOffset: number, slot: MealSlot, at?: string | null): string | undefined {
  if (at) return new Date(Math.min(new Date(at).getTime(), Date.now())).toISOString();
  if (dayOffset === 0 && slot === 'now') return undefined;
  return slotDate(dayOffset, slot).toISOString();
}

/**
 * EXIF "2026:11:07 19:42:10" (local time, as cameras write it) → ISO, or null.
 * Photos without a date (screenshots, saved images) return null.
 */
export function exifTakenAt(exif: Record<string, any> | null | undefined): string | null {
  const raw = exif?.DateTimeOriginal ?? exif?.DateTimeDigitized ?? exif?.['{Exif}']?.DateTimeOriginal ?? exif?.DateTime;
  if (typeof raw !== 'string') return null;
  const m = raw.match(/^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] ?? 0));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** True when the chosen time is not today, so today's totals don't change. */
export function isOtherDay(dayOffset: number): boolean {
  return dayOffset > 0;
}
