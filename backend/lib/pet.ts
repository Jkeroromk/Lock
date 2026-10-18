import { prisma } from '@/lib/prisma';

/**
 * 伙伴 (pet). A bichon coach (named by the user) raises one buddy at a time.
 * The buddy grows from what the user does each local day — training, steps,
 * logging meals, hitting protein — and from friends' pats. Nothing is ever
 * taken away: a rest day simply adds nothing. At stage 3 the buddy can
 * graduate into the collection and a new one starts from zero.
 */

export const BUDDY_KINDS = ['corgi', 'cat', 'penguin'] as const;
export type BuddyKind = (typeof BUDDY_KINDS)[number];

/** XP needed for stage 2 and stage 3. */
export const STAGE_XP = [150, 400] as const;
export const GRADUATE_XP = STAGE_XP[1];

export const XP = {
  training: 30,
  steps8k: 10,
  steps10k: 15,
  meals: 10,
  protein: 10,
  pat: 2,
} as const;
export const DAILY_CAP = XP.training + XP.steps10k + XP.meals + XP.protein; // 65
export const MAX_PATS_RECEIVED = 5;
export const TRAINING_DAY_PROTEIN = 20;
/** Days recomputed on every sync, so late-logged meals and workouts still count. */
const SYNC_DAYS = 3;

export function stageFor(xp: number): 1 | 2 | 3 {
  if (xp < STAGE_XP[0]) return 1;
  if (xp < STAGE_XP[1]) return 2;
  return 3;
}

export function isBuddyKind(v: unknown): v is BuddyKind {
  return typeof v === 'string' && (BUDDY_KINDS as readonly string[]).includes(v);
}

/** Trims and limits a user-chosen name; null when empty. */
export function cleanName(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.replace(/\s+/g, ' ').trim();
  if (!s) return null;
  return Array.from(s).slice(0, 12).join('');
}

/** A valid IANA zone or UTC. */
export function safeTimeZone(tz: string | null | undefined): string {
  if (!tz) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

export function localDayKey(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function shiftDay(dayKey: string, delta: number): string {
  const d = new Date(`${dayKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

export interface DayFacts {
  trained: boolean;
  steps: number;
  meals: number;
  protein: number;
  proteinTarget: number;
}

export function xpForDay(f: DayFacts): number {
  let xp = 0;
  if (f.trained) xp += XP.training;
  if (f.steps >= 10_000) xp += XP.steps10k;
  else if (f.steps >= 8_000) xp += XP.steps8k;
  if (f.meals >= 3) xp += XP.meals;
  if (f.proteinTarget > 0 && f.protein >= f.proteinTarget) xp += XP.protein;
  return Math.min(xp, DAILY_CAP);
}

/**
 * Recomputes the last few local days for `userId` from meals and workouts.
 * `todaySteps` comes from the phone (HealthKit); past days keep the highest
 * step count seen for them. `proteinBase` is the user's normal protein
 * target; training days add TRAINING_DAY_PROTEIN, like the app shows.
 */
export async function syncPetDays(
  userId: string,
  tz: string,
  startDay: string,
  opts: { todaySteps?: number | null; proteinBase?: number | null },
): Promise<void> {
  const today = localDayKey(new Date(), tz);
  const days: string[] = [];
  for (let i = SYNC_DAYS - 1; i >= 0; i--) {
    const k = shiftDay(today, -i);
    if (k >= startDay) days.push(k);
  }
  if (days.length === 0) return;

  const since = new Date(Date.now() - (SYNC_DAYS + 1) * 86_400_000);
  const [mealRows, sessions, existing] = await Promise.all([
    prisma.$queryRaw<{ day: string; n: bigint; protein: number | null }[]>`
      SELECT to_char(created_at AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS day,
             count(*) AS n,
             sum(coalesce(protein, 0))::float AS protein
      FROM meals
      WHERE user_id = ${userId} AND created_at >= ${since}
      GROUP BY 1`,
    prisma.workoutSession.findMany({
      where: { userId, dayKey: { in: days } },
      select: { dayKey: true },
    }),
    prisma.petDay.findMany({ where: { userId, dayKey: { in: days } } }),
  ]);

  const meals = new Map(mealRows.map((r) => [r.day, { n: Number(r.n), protein: Math.round(r.protein ?? 0) }]));
  const trainedDays = new Set(sessions.map((s) => s.dayKey));
  const prev = new Map(existing.map((d) => [d.dayKey, d]));
  const base =
    typeof opts.proteinBase === 'number' && Number.isFinite(opts.proteinBase)
      ? Math.min(400, Math.max(30, Math.round(opts.proteinBase)))
      : null;
  const todaySteps =
    typeof opts.todaySteps === 'number' && Number.isFinite(opts.todaySteps)
      ? Math.min(100_000, Math.max(0, Math.round(opts.todaySteps)))
      : null;

  await Promise.all(
    days.map((dayKey) => {
      const old = prev.get(dayKey);
      const trained = trainedDays.has(dayKey);
      // Keep the target a day was judged against unless we learn a new one today.
      const target =
        dayKey === today && base != null
          ? base + (trained ? TRAINING_DAY_PROTEIN : 0)
          : old?.proteinTarget || (base != null ? base + (trained ? TRAINING_DAY_PROTEIN : 0) : 0);
      const steps = Math.max(old?.steps ?? 0, dayKey === today ? todaySteps ?? 0 : 0);
      const m = meals.get(dayKey) ?? { n: 0, protein: 0 };
      const facts: DayFacts = { trained, steps, meals: m.n, protein: m.protein, proteinTarget: target };
      const xp = xpForDay(facts);
      return prisma.petDay.upsert({
        where: { userId_dayKey: { userId, dayKey } },
        create: { userId, dayKey, xp, ...facts },
        update: { xp, ...facts },
      });
    }),
  );
}

/** Lifetime XP (days + pats) per user, before subtracting each buddy's offset. */
export async function lifetimeXp(userIds: string[]): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const [days, pats] = await Promise.all([
    prisma.petDay.groupBy({ by: ['userId'], where: { userId: { in: userIds } }, _sum: { xp: true } }),
    prisma.petPat.groupBy({ by: ['toUser'], where: { toUser: { in: userIds } }, _count: { _all: true } }),
  ]);
  const out = new Map<string, number>();
  for (const d of days) out.set(d.userId, d._sum.xp ?? 0);
  for (const p of pats) out.set(p.toUser, (out.get(p.toUser) ?? 0) + p._count._all * XP.pat);
  return out;
}

export async function buddyXp(userId: string, xpOffset: number): Promise<number> {
  const total = (await lifetimeXp([userId])).get(userId) ?? 0;
  return Math.max(0, total - xpOffset);
}

/** Everything the 伙伴 tab needs. */
export async function petState(userId: string, tz: string) {
  const profile = await prisma.petProfile.findUnique({ where: { userId } });
  const today = localDayKey(new Date(), tz);
  if (!profile) {
    return { profile: null, today };
  }

  const [total, recent, collection, patsToday] = await Promise.all([
    lifetimeXp([userId]).then((m) => m.get(userId) ?? 0),
    prisma.petDay.findMany({
      where: { userId, dayKey: { gte: shiftDay(today, -6) } },
      orderBy: { dayKey: 'asc' },
    }),
    prisma.petCollection.findMany({ where: { userId }, orderBy: { graduatedAt: 'asc' } }),
    prisma.petPat.count({ where: { toUser: userId, dayKey: today } }),
  ]);

  const xp = Math.max(0, total - profile.xpOffset);
  const stage = stageFor(xp);
  const todayRow = recent.find((d) => d.dayKey === today);
  const buddyStartDay = localDayKey(profile.buddyStartedAt, tz);

  return {
    today,
    profile: {
      coachName: profile.coachName,
      buddyKind: profile.buddyKind,
      buddyName: profile.buddyName,
      buddyDay: daysBetween(buddyStartDay, today) + 1,
    },
    xp,
    stage,
    nextAt: stage === 1 ? STAGE_XP[0] : stage === 2 ? STAGE_XP[1] : null,
    canGraduate: xp >= GRADUATE_XP,
    todayFacts: {
      xp: todayRow?.xp ?? 0,
      trained: todayRow?.trained ?? false,
      steps: todayRow?.steps ?? 0,
      meals: todayRow?.meals ?? 0,
      protein: todayRow?.protein ?? 0,
      proteinTarget: todayRow?.proteinTarget ?? 0,
      pats: patsToday,
    },
    recent: recent.map((d) => ({ dayKey: d.dayKey, xp: d.xp })),
    collection: collection.map((c) => ({
      id: c.id,
      kind: c.kind,
      name: c.name,
      days: c.days,
      graduatedAt: c.graduatedAt.toISOString(),
    })),
  };
}

/** Pet summaries for leaderboard rows: kind, name and stage of each user's buddy. */
export async function petSummaries(userIds: string[]) {
  const profiles = await prisma.petProfile.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, buddyKind: true, buddyName: true, xpOffset: true },
  });
  const totals = await lifetimeXp(profiles.map((p) => p.userId));
  return new Map(
    profiles.map((p) => [
      p.userId,
      { kind: p.buddyKind, name: p.buddyName, stage: stageFor(Math.max(0, (totals.get(p.userId) ?? 0) - p.xpOffset)) },
    ]),
  );
}
