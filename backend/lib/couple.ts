import { prisma } from '@/lib/prisma';
import { localDayKey, safeTimeZone, shiftDay } from '@/lib/pet';

/**
 * Couple space (app: services/couple.ts). Two friends link as a couple once
 * the other accepts; a user is in at most one PENDING or ACCEPTED link.
 */

export const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date in YYYY-MM-DD form. */
export function isDayKey(v: unknown): v is string {
  if (typeof v !== 'string' || !DAY_KEY.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** DATE column ↔ YYYY-MM-DD. */
export const dateOf = (dayKey: string) => new Date(`${dayKey}T00:00:00Z`);
export const keyOf = (d: Date) => d.toISOString().slice(0, 10);

/** The caller's open link (accepted, or an invite either way), newest first. */
export function activeLinkFor(userId: string) {
  return prisma.coupleLink.findFirst({
    where: {
      status: { in: ['PENDING', 'ACCEPTED'] },
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    orderBy: { createdAt: 'desc' },
  });
}

export const PERSON_SELECT = {
  id: true, name: true, username: true, avatarImage: true, avatarEmoji: true, gender: true, timeZone: true, goalSettings: true,
} as const;

type PersonRow = {
  id: string; name: string | null; username: string | null; avatarImage: string | null;
  avatarEmoji: string | null; gender: string | null;
};

export function normalizeGender(g: string | null | undefined): 'male' | 'female' | 'other' | null {
  if (!g) return null;
  const s = g.trim().toLowerCase();
  if (!s) return null;
  if (['male', 'm', 'man', '男', '男性'].includes(s)) return 'male';
  if (['female', 'f', 'woman', '女', '女性'].includes(s)) return 'female';
  return 'other';
}

export function toPerson(u: PersonRow) {
  return {
    id: u.id,
    name: u.name || u.username || '用户',
    avatarImage: u.avatarImage ?? null,
    avatarEmoji: u.avatarEmoji ?? null,
    gender: normalizeGender(u.gender),
  };
}

/** Daily calorie goal the user set (custom mode); the app's auto goal isn't stored, so 2000 then. */
function calorieGoalOf(goalSettings: unknown): number {
  const s = goalSettings as { calories?: unknown } | null;
  const n = typeof s?.calories === 'number' ? s.calories : 0;
  return n >= 800 && n <= 6000 ? Math.round(n) : 2000;
}

/** One person's day on their own clock. */
export async function dayFor(userId: string, tz: string, goalSettings: unknown) {
  const zone = safeTimeZone(tz);
  const dayKey = localDayKey(new Date(), zone);
  const since = new Date(Date.now() - 2 * 86_400_000);
  const [mealRows, water, health, sessions] = await Promise.all([
    prisma.$queryRaw<{ cal: number | null; prot: number | null; n: bigint }[]>`
      SELECT coalesce(sum(calories), 0)::float AS cal,
             coalesce(sum(coalesce(protein, 0)), 0)::float AS prot,
             count(*) AS n
      FROM meals
      WHERE user_id = ${userId} AND created_at >= ${since}
        AND to_char(created_at AT TIME ZONE ${zone}, 'YYYY-MM-DD') = ${dayKey}`,
    prisma.dailyWater.findUnique({ where: { userId_dayKey: { userId, dayKey } } }),
    prisma.healthSync.findUnique({ where: { userId_date: { userId, date: dateOf(dayKey) } } }),
    prisma.workoutSession.count({ where: { userId, dayKey } }),
  ]);
  const m = mealRows[0];
  return {
    calories: Math.round(m?.cal ?? 0),
    calorieGoal: calorieGoalOf(goalSettings),
    protein: Math.round(m?.prot ?? 0),
    waterMl: water?.ml ?? 0,
    waterGoalMl: water?.goalMl ?? 2000,
    steps: health?.steps ?? 0,
    trained: sessions > 0,
    logged: Number(m?.n ?? 0) > 0,
  };
}

/** Local days (own clock) on which the user logged at least one meal, last ~4 months. */
async function loggedDays(userId: string, tz: string): Promise<Set<string>> {
  const zone = safeTimeZone(tz);
  const since = new Date(Date.now() - 122 * 86_400_000);
  const rows = await prisma.$queryRaw<{ day: string }[]>`
    SELECT DISTINCT to_char(created_at AT TIME ZONE ${zone}, 'YYYY-MM-DD') AS day
    FROM meals WHERE user_id = ${userId} AND created_at >= ${since}`;
  return new Set(rows.map((r) => r.day));
}

/** Days in a row (ending today or yesterday) on which both logged a meal. */
export async function coupleStreak(aId: string, aTz: string, bId: string, bTz: string, todayKey: string): Promise<number> {
  const [a, b] = await Promise.all([loggedDays(aId, aTz), loggedDays(bId, bTz)]);
  const both = (k: string) => a.has(k) && b.has(k);
  let day = both(todayKey) ? todayKey : shiftDay(todayKey, -1);
  let n = 0;
  while (n < 120 && both(day)) { n++; day = shiftDay(day, -1); }
  return n;
}

/** Days until an anniversary next comes round (yearly: next birthday; once: the date, < 0 if past). */
export function daysUntil(dayKey: string, yearly: boolean, todayKey: string): number {
  const today = dateOf(todayKey).getTime();
  if (!yearly) return Math.round((dateOf(dayKey).getTime() - today) / 86_400_000);
  const [, m, d] = dayKey.split('-');
  const year = Number(todayKey.slice(0, 4));
  let next = new Date(`${year}-${m}-${d}T00:00:00Z`);
  if (isNaN(next.getTime()) || next.getTime() < today) next = new Date(`${year + 1}-${m}-${d}T00:00:00Z`);
  // 29 Feb in a non-leap year rolls to 1 Mar, which is fine for a countdown.
  return Math.round((next.getTime() - today) / 86_400_000);
}

/** Upcoming first (soonest first), then past one-off days (most recent first). */
export function anniversaryOrder(dayKey: string, yearly: boolean, todayKey: string): number {
  const d = daysUntil(dayKey, yearly, todayKey);
  return d >= 0 ? d : 100_000 - d;
}
