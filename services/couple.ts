import { api } from './client';

/**
 * Couple space: two friends link as a couple (the other must accept), see each
 * other's day, nudge each other, keep anniversaries, and pool their daily
 * growth into points that buy furniture styles for their room.
 * Backend: backend/app/api/couple/*.
 */

export type Gender = 'male' | 'female' | 'other' | null;

export interface CouplePerson {
  id: string;
  name: string;
  avatarImage?: string | null;
  avatarEmoji?: string | null;
  gender: Gender;
}

/** One person's day as the other sees it (their own local day). */
export interface CoupleDay {
  calories: number;
  calorieGoal: number;
  protein: number;
  waterMl: number;
  waterGoalMl: number;
  steps: number;
  /** Finished a workout today. */
  trained: boolean;
  /** Logged at least one meal today. */
  logged: boolean;
}

export interface Anniversary {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** Every year (birthdays) rather than once. */
  yearly: boolean;
  emoji: string;
  /** Built in: the day you got together (date = together.since). Not deletable. */
  builtIn?: boolean;
}

export interface Couple {
  id: string;
  status: 'PENDING' | 'ACCEPTED';
  /** I sent the invite (PENDING) / I was the one who invited (ACCEPTED). */
  iInvited: boolean;
  me: CouplePerson;
  partner: CouplePerson;
  /** YYYY-MM-DD the two got together (chosen in the invite). */
  since: string;
  /** Whose buddy the two raise together. */
  petOwnerId: string;
  /** Days in a row both logged something. */
  streak: number;
  today: { me: CoupleDay; partner: CoupleDay } | null;
  anniversaries: Anniversary[];
  home?: CoupleHome | null;
}

/** The shared wallet and the room's furniture (see constants/coupleHome.ts). */
export interface CoupleHome {
  earned: number;
  spent: number;
  balance: number;
  owned: string[];
  equipped: Record<string, string>; // slot → item id
}

export type NudgeKind = 'water' | 'eat' | 'train' | 'love';

/** My couple (accepted, or an invite I sent / received), or null. */
export const fetchCouple = async (): Promise<Couple | null> => {
  const res = await api.get<{ couple: Couple | null }>('/api/couple');
  return res.data.couple;
};

/** Invite a friend to be my couple. `since` is YYYY-MM-DD. */
export const inviteCouple = async (friendId: string, since: string, petOwnerId: string): Promise<void> => {
  await api.post('/api/couple', { friendId, since, petOwnerId });
};

export const respondCouple = async (id: string, action: 'accept' | 'decline'): Promise<void> => {
  await api.patch(`/api/couple/${id}`, { action });
};

/** Unlink (either person), or cancel an invite I sent. */
export const endCouple = async (id: string): Promise<void> => {
  await api.delete(`/api/couple/${id}`);
};

/** Push a little nudge to my partner. */
/** Buy a furniture style with the shared points (it goes straight into the room), or show one already owned. */
export const updateHome = async (action: 'buy' | 'equip', itemId: string): Promise<CoupleHome> => {
  const res = await api.post<{ home: CoupleHome }>('/api/couple/home', { action, itemId });
  return res.data.home;
};

export const nudgePartner = async (kind: NudgeKind): Promise<void> => {
  await api.post('/api/couple/nudge', { kind });
};

export const addAnniversary = async (a: { title: string; date: string; yearly: boolean; emoji: string }): Promise<Anniversary> => {
  const res = await api.post<Anniversary>('/api/couple/anniversaries', a);
  return res.data;
};

export const deleteAnniversary = async (id: string): Promise<void> => {
  await api.delete(`/api/couple/anniversaries/${id}`);
};

/** Today's water, so a partner can see it (water is otherwise kept on the phone). */
export const syncWater = async (dayKey: string, ml: number, goalMl: number): Promise<void> => {
  await api.put('/api/water', { dayKey, ml, goalMl });
};

// ── date helpers shared by the couple screens ──

const DAY = 86_400_000;
const parse = (ymd: string) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d); };
const startOfToday = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };

/** Whole days since a YYYY-MM-DD date (0 on the day itself). */
export const daysSince = (ymd: string) => Math.round((startOfToday().getTime() - parse(ymd).getTime()) / DAY);

/**
 * Next time an anniversary comes round: for yearly ones the next birthday,
 * for one-off ones the date itself. `days` < 0 means it's in the past.
 */
export function nextOccurrence(a: Pick<Anniversary, 'date' | 'yearly'>): { date: Date; days: number } {
  const today = startOfToday();
  const d = parse(a.date);
  if (a.yearly) {
    let next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    if (next < today) next = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
    return { date: next, days: Math.round((next.getTime() - today.getTime()) / DAY) };
  }
  return { date: d, days: Math.round((d.getTime() - today.getTime()) / DAY) };
}

/** Milestones counted from the day you got together: 100, 200, 300… days and each year. */
export function nextMilestone(since: string): { title: string; days: number; date: Date } {
  const start = parse(since);
  const passed = daysSince(since);
  const nextHundred = (Math.floor(passed / 100) + 1) * 100;
  const hundredDate = new Date(start.getTime() + nextHundred * DAY);
  let years = startOfToday().getFullYear() - start.getFullYear();
  let yearDate = new Date(start.getFullYear() + years, start.getMonth(), start.getDate());
  if (yearDate <= startOfToday()) { years += 1; yearDate = new Date(start.getFullYear() + years, start.getMonth(), start.getDate()); }
  const toHundred = nextHundred - passed;
  const toYear = Math.round((yearDate.getTime() - startOfToday().getTime()) / DAY);
  return toYear < toHundred
    ? { title: `${years}y`, days: toYear, date: yearDate }
    : { title: `${nextHundred}d`, days: toHundred, date: hundredDate };
}
