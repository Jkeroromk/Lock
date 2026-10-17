import { prisma } from '@/lib/prisma';
import { localDay } from '@/lib/ai-rate-limit';
import { DAILY_ENCOUNTERS, EGG_STEPS, rollShiny, speciesForMeal, type Species } from './species';
import { MILESTONES, cleanName, milestonesReached, parseLook, sanitizeLook } from './avatar';

export type EncounterView = { id: string; species: string; shiny: boolean; origin: string };

const validZone = (tz?: string | null) => {
  if (!tz) return 'UTC';
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz; } catch { return 'UTC'; }
};

/** Lifetime steps across every synced day (each day's row holds that day's running total). */
async function lifetimeSteps(userId: string): Promise<number> {
  const agg = await prisma.healthSync.aggregate({ where: { userId }, _sum: { steps: true } });
  return agg._sum.steps ?? 0;
}

/** The game row; a new player's first egg starts from their current step total. */
export async function ensureProfile(userId: string) {
  const existing = await prisma.gameProfile.findUnique({ where: { userId } });
  if (existing) return existing;
  const baseline = await lifetimeSteps(userId);
  return prisma.gameProfile.upsert({ where: { userId }, create: { userId, eggBaseline: baseline }, update: {} });
}

async function encountersToday(userId: string, dayKey: string) {
  return prisma.encounter.count({ where: { userId, dayKey } });
}

async function createEncounter(userId: string, species: Species, origin: 'MEAL' | 'WATER', refKey: string, dayKey: string): Promise<EncounterView | null> {
  await ensureProfile(userId);
  if ((await encountersToday(userId, dayKey)) >= DAILY_ENCOUNTERS) return null;
  try {
    const e = await prisma.encounter.create({ data: { userId, species, shiny: rollShiny(), origin, refKey, dayKey } });
    return { id: e.id, species: e.species, shiny: e.shiny, origin: e.origin };
  } catch (err: any) {
    if (err?.code === 'P2002') return null; // this meal / this day already paid out
    throw err;
  }
}

/** A logged meal may bring an encounter (within the daily cap). */
export function createMealEncounter(
  userId: string,
  meal: { id: string; foodName: string; protein: unknown; carbs: unknown; fat: unknown },
  timeZone?: string | null,
) {
  const species = speciesForMeal(meal.foodName, Number(meal.protein) || 0, Number(meal.carbs) || 0, Number(meal.fat) || 0);
  return createEncounter(userId, species, 'MEAL', `meal:${meal.id}`, localDay(new Date(), validZone(timeZone)));
}

/** Reaching the day's water goal brings one water-type encounter (within the daily cap). */
export function createWaterEncounter(userId: string, timeZone?: string | null) {
  const day = localDay(new Date(), validZone(timeZone));
  return createEncounter(userId, 'drip', 'WATER', `water:${userId}:${day}`, day);
}

export async function captureEncounter(userId: string, id: string) {
  const e = await prisma.encounter.findFirst({ where: { id, userId } });
  if (!e) return null;
  const claimed = await prisma.encounter.updateMany({ where: { id, userId, status: 'PENDING' }, data: { status: 'CAUGHT', caughtAt: new Date() } });
  if (claimed.count === 0) return { creature: null, alreadyCaught: true };
  const creature = await prisma.creature.create({ data: { userId, species: e.species, shiny: e.shiny, origin: e.origin } });
  return { creature: { id: creature.id, species: creature.species, shiny: creature.shiny }, alreadyCaught: false };
}

export async function hatchEgg(userId: string) {
  const profile = await ensureProfile(userId);
  const total = await lifetimeSteps(userId);
  if (total - profile.eggBaseline < EGG_STEPS) return null;
  // Move the baseline first so a double tap can't hatch twice.
  const moved = await prisma.gameProfile.updateMany({
    where: { userId, eggBaseline: profile.eggBaseline },
    data: { eggBaseline: total, eggsHatched: { increment: 1 } },
  });
  if (moved.count === 0) return null;
  const creature = await prisma.creature.create({ data: { userId, species: 'puff', shiny: rollShiny(), origin: 'EGG' } });
  return { id: creature.id, species: creature.species, shiny: creature.shiny };
}

/** The app has celebrated milestones up to `count`. */
export async function markMilestonesSeen(userId: string, count: number) {
  await ensureProfile(userId);
  await prisma.gameProfile.update({ where: { userId }, data: { stageSeen: Math.max(0, Math.min(MILESTONES.length, Math.round(count))) } });
}

/** Save the avatar; locked items fall back to defaults. */
export async function saveAvatar(userId: string, look: unknown, name: unknown, timeZone?: string | null) {
  await ensureProfile(userId);
  const reached = milestonesReached(await loggedDays(userId, validZone(timeZone)));
  const clean = sanitizeLook(look, reached);
  const nm = cleanName(name);
  await prisma.gameProfile.update({ where: { userId }, data: { look: JSON.stringify(clean), ...(nm ? { avatarName: nm } : {}) } });
  return { look: clean, name: nm };
}

/** Days (in the user's zone) with at least one logged meal. */
async function loggedDays(userId: string, timeZone: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(DISTINCT (created_at AT TIME ZONE ${timeZone})::date)::int AS n FROM meals WHERE user_id = ${userId}`;
  return rows[0]?.n ?? 0;
}

export async function gameState(userId: string, timeZone?: string | null) {
  const tz = validZone(timeZone);
  const profile = await ensureProfile(userId);
  const today = localDay(new Date(), tz);
  const [days, steps, pending, todayCount, waterToday, owned] = await Promise.all([
    loggedDays(userId, tz),
    lifetimeSteps(userId),
    prisma.encounter.findMany({ where: { userId, status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 20 }),
    encountersToday(userId, today),
    prisma.encounter.count({ where: { userId, dayKey: today, origin: 'WATER' } }),
    prisma.creature.groupBy({ by: ['species', 'shiny'], where: { userId }, _count: { _all: true } }),
  ]);
  const dex: Record<string, { count: number; shiny: boolean }> = {};
  for (const row of owned) {
    const d = (dex[row.species] ??= { count: 0, shiny: false });
    d.count += row._count._all;
    if (row.shiny) d.shiny = true;
  }
  const reached = milestonesReached(days);
  const next = MILESTONES[reached];
  return {
    avatar: {
      created: !!profile.look,
      look: parseLook(profile.look, reached),
      name: profile.avatarName,
      level: Math.max(1, days),
      loggedDays: days,
      milestones: reached,
      milestonesSeen: Math.min(profile.stageSeen, reached),
      unlocked: MILESTONES.slice(0, reached).map((m) => ({ days: m.days, field: m.field, value: m.value })),
      next: next ? { days: next.days, field: next.field, value: next.value } : null,
    },
    egg: { progress: Math.max(0, Math.min(EGG_STEPS, steps - profile.eggBaseline)), target: EGG_STEPS, hatched: profile.eggsHatched },
    today: { encounters: todayCount, cap: DAILY_ENCOUNTERS, waterDone: waterToday > 0 },
    pending: pending.map((e) => ({ id: e.id, species: e.species, shiny: e.shiny, origin: e.origin })),
    dex,
  };
}
