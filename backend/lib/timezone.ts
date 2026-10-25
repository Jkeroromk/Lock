import { prisma } from '@/lib/prisma';

/**
 * The time zone that decides "today" for daily limits (AI scans, buddy pats).
 *
 * The app sends its zone in `x-timezone` on every request. That header used to
 * be trusted per request, so switching it to a zone that had just passed
 * midnight reset the free scan counter (about 35 extra resets a day). Now the
 * zone is stored on the user and the header can only change it once every
 * TZ_CHANGE_COOLDOWN_MS, which still follows someone who travels.
 */
export const TZ_CHANGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** The canonical IANA name, or null when `tz` isn't a valid zone. */
export function validTimeZone(tz: string | null | undefined): string | null {
  if (!tz || typeof tz !== 'string' || tz.length > 64) return null;
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

/** The user's stored zone, adopting the request's zone when allowed. Falls back to UTC. */
export async function trustedTimeZone(userId: string, request: Request): Promise<string> {
  const claimed = validTimeZone(request.headers.get('x-timezone'));
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timeZone: true, timeZoneSetAt: true },
  });
  if (!user) return claimed ?? 'UTC';

  const stored = validTimeZone(user.timeZone);
  if (!claimed || claimed === stored) return stored ?? 'UTC';

  const canChange =
    !stored || !user.timeZoneSetAt || Date.now() - user.timeZoneSetAt.getTime() >= TZ_CHANGE_COOLDOWN_MS;
  if (!canChange) return stored;

  // Conditional on the old value, so two requests with different zones can't both win.
  const changed = await prisma.user.updateMany({
    where: { id: userId, timeZoneSetAt: user.timeZoneSetAt },
    data: { timeZone: claimed, timeZoneSetAt: new Date() },
  });
  if (changed.count > 0) return claimed;

  const now = await prisma.user.findUnique({ where: { id: userId }, select: { timeZone: true } });
  return validTimeZone(now?.timeZone) ?? 'UTC';
}
