import { prisma } from '@/lib/prisma';
import { localDayKey, safeTimeZone, shiftDay } from '@/lib/pet';

/**
 * "Today" on a person's own clock.
 *
 * The server runs in UTC, so `new Date().setHours(0, 0, 0, 0)` is UTC midnight:
 * for someone in New York "today" used to flip at 7–8 pm, and for someone in
 * Shanghai it covered 8 am to 8 am. Use these helpers instead.
 */

/** Milliseconds `tz` is ahead of UTC at instant `at`. */
function offsetMs(at: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(at));
  const p: Record<string, number> = {};
  for (const x of parts) if (x.type !== 'literal') p[x.type] = Number(x.value);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(at / 1000) * 1000;
}

/** The instant local midnight starts `dayKey` (YYYY-MM-DD) in `tz`. DST-safe. */
export function startOfLocalDay(dayKey: string, tz: string): Date {
  const zone = safeTimeZone(tz);
  const [y, m, d] = dayKey.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  // Two passes: the offset at the guess can differ from the offset at the answer near a DST change.
  let t = guess - offsetMs(guess, zone);
  t = guess - offsetMs(t, zone);
  return new Date(t);
}

/** `[start, end)` of the local day containing `now` in `tz`, and its key. */
export function localDayRange(tz: string, now = new Date()): { key: string; start: Date; end: Date } {
  const zone = safeTimeZone(tz);
  const key = localDayKey(now, zone);
  return { key, start: startOfLocalDay(key, zone), end: startOfLocalDay(shiftDay(key, 1), zone) };
}

/**
 * Today's calories per user, each on their own clock (friends can live in
 * different zones). One query per distinct zone — usually one or two.
 */
export async function caloriesToday(users: { id: string; timeZone: string | null }[]): Promise<Map<string, number>> {
  const byZone = new Map<string, string[]>();
  for (const u of users) {
    const z = safeTimeZone(u.timeZone);
    byZone.set(z, [...(byZone.get(z) ?? []), u.id]);
  }
  const out = new Map<string, number>();
  await Promise.all(Array.from(byZone, async ([zone, ids]) => {
    const { start, end } = localDayRange(zone);
    const sums = await prisma.meal.groupBy({
      by: ['userId'],
      where: { userId: { in: ids }, createdAt: { gte: start, lt: end } },
      _sum: { calories: true },
    });
    for (const s of sums) out.set(s.userId, Math.round(Number(s._sum.calories || 0)));
  }));
  return out;
}

/**
 * The streak as others should see it. The stored count only changes when a
 * meal is logged, so someone who stopped logging a week ago still showed their
 * old streak. It counts while the last meal was today or yesterday (own clock).
 */
export async function liveStreaks(
  users: { id: string; streak: number; timeZone: string | null }[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const withStreak = users.filter((u) => u.streak > 0);
  for (const u of users) out.set(u.id, 0);
  if (withStreak.length === 0) return out;

  const since = new Date(Date.now() - 3 * 86_400_000);
  const last = await prisma.meal.groupBy({
    by: ['userId'],
    where: { userId: { in: withStreak.map((u) => u.id) }, createdAt: { gte: since } },
    _max: { createdAt: true },
  });
  const lastAt = new Map(last.map((r) => [r.userId, r._max.createdAt]));
  const now = new Date();
  for (const u of withStreak) {
    const at = lastAt.get(u.id);
    if (!at) continue;
    const zone = safeTimeZone(u.timeZone);
    const today = localDayKey(now, zone);
    const lastDay = localDayKey(at, zone);
    if (lastDay === today || lastDay === shiftDay(today, -1)) out.set(u.id, u.streak);
  }
  return out;
}
