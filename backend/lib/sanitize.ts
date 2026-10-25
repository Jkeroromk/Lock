/**
 * Cleaning for text that users type and other users see (profile fields,
 * challenge titles) and for user text placed inside push notifications.
 */

// Control and format characters: newlines, zero-width characters, and the
// bidi overrides that can make text read backwards (e.g. a fake file name).
// The zero-width joiner stays: emoji like 🏃‍♂️ are built with it.
const INVISIBLE = /(?!\u200D)[\p{Cc}\p{Cf}\u2028\u2029]/gu;

/** Trimmed single-line text, cut to `max` characters; null when empty or not a string. */
export function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.replace(INVISIBLE, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  return Array.from(s).slice(0, max).join('');
}

/** Like cleanText but keeps line breaks (bios), at most `maxLines` lines. */
export function cleanMultiline(v: unknown, max: number, maxLines = 4): string | null {
  if (typeof v !== 'string') return null;
  const lines = v
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(INVISIBLE, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, maxLines);
  const s = lines.join('\n');
  if (!s) return null;
  return Array.from(s).slice(0, max).join('');
}

// Links and bare domains ("lock-support.com", "www.x.io") in a push notification
// would come from Lock itself as far as the reader can tell: never pass them on.
const LINKISH = /(https?:\/\/|www\.)\S*|\b[\p{L}\p{N}-]+(\.[\p{L}\p{N}-]+)*\.[a-z]{2,}\b/giu;

/** User text for a push notification: one short line, no links. */
export function pushText(v: unknown, max = 20): string | null {
  const s = cleanText(v, 200);
  if (!s) return null;
  const noLinks = s.replace(LINKISH, '').replace(/\s+/g, ' ').trim();
  if (!noLinks) return null;
  return Array.from(noLinks).slice(0, max).join('');
}

/** Name to show for a user inside a push notification. */
export function pushName(u: { name?: string | null; username?: string | null } | null | undefined, fallback: string): string {
  return pushText(u?.name) ?? pushText(u?.username) ?? fallback;
}

/** Usernames: what the app's editor already allows (a–z, 0–9, _), 1–30 long. */
export const USERNAME_RE = /^[a-z0-9_]{1,30}$/;

/**
 * Names that would read as Lock itself or as staff. Matched after removing
 * underscores and digits, so "lock_support2" counts as "locksupport".
 */
const RESERVED = new Set([
  'lock', 'lockin', 'lockapp', 'lockofficial', 'locksupport', 'lockteam', 'lockpro',
  'admin', 'administrator', 'support', 'help', 'helpdesk', 'official', 'staff', 'team',
  'moderator', 'mod', 'system', 'security', 'apple', 'appstore', 'claude', 'anthropic',
  'jkeroro', 'root', 'null', 'undefined',
]);

export function isReservedUsername(username: string): boolean {
  return RESERVED.has(username.toLowerCase().replace(/[_\d]/g, ''));
}
