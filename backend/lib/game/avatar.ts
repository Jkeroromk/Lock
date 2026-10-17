/**
 * The player's avatar. Keep in sync with the app's lib/game/avatar.ts and the
 * engine (game/engine.html). Some items unlock by logging on more days.
 */
export const AVATAR_OPTIONS = {
  gender: ['boy', 'girl'],
  skin: ['light', 'pale', 'tan', 'deep'],
  hair: ['short', 'spiky', 'buzz', 'long', 'pony', 'bun'],
  hairColor: ['black', 'brown', 'blonde', 'pink', 'blue', 'silver'],
  top: ['yellow', 'white', 'black', 'red', 'blue', 'green', 'gold'],
  bottom: ['pants', 'shorts', 'skirt'],
  bottomColor: ['denim', 'black', 'khaki', 'pink'],
  acc: ['none', 'glasses', 'headband', 'cap', 'headphones', 'crown'],
} as const;

export type AvatarLook = { [K in keyof typeof AVATAR_OPTIONS]: (typeof AVATAR_OPTIONS)[K][number] };

export const DEFAULT_LOOK: AvatarLook = { gender: 'boy', skin: 'light', hair: 'short', hairColor: 'black', top: 'yellow', bottom: 'pants', bottomColor: 'denim', acc: 'none' };

/** Days with a logged meal → an item unlocked. */
export const MILESTONES: { days: number; field: keyof AvatarLook; value: string }[] = [
  { days: 3, field: 'acc', value: 'cap' },
  { days: 7, field: 'acc', value: 'headphones' },
  { days: 14, field: 'acc', value: 'crown' },
  { days: 30, field: 'top', value: 'gold' },
];

export const milestonesReached = (days: number) => MILESTONES.filter((m) => days >= m.days).length;

/** Keeps only known options, and only items the player has unlocked. */
export function sanitizeLook(input: unknown, reached: number): AvatarLook {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const look = { ...DEFAULT_LOOK } as Record<string, string>;
  for (const key of Object.keys(AVATAR_OPTIONS) as (keyof AvatarLook)[]) {
    const v = src[key];
    if (typeof v === 'string' && (AVATAR_OPTIONS[key] as readonly string[]).includes(v)) look[key] = v;
  }
  MILESTONES.forEach((m, i) => { if (i >= reached && look[m.field] === m.value) look[m.field] = DEFAULT_LOOK[m.field]; });
  return look as AvatarLook;
}

export function parseLook(raw: string | null | undefined, reached: number): AvatarLook | null {
  if (!raw) return null;
  try { return sanitizeLook(JSON.parse(raw), reached); } catch { return null; }
}

export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 12);
  return name || null;
}
