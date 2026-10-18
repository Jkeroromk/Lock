import type { ImageSourcePropType } from 'react-native';

/**
 * 伙伴 (pet) art and numbers. The coach is always the bichon; the buddy is one
 * of BUDDY_KINDS and grows through 3 stages. Mirrors backend/lib/pet.ts.
 */
export const BUDDY_KINDS = ['corgi', 'cat', 'penguin'] as const;
export type BuddyKind = (typeof BUDDY_KINDS)[number];
export type Stage = 1 | 2 | 3;
export type CoachPose = 'idle' | 'blink' | 'cheer' | 'sleep' | 'think' | 'wave' | 'sad';

export const STAGE_XP = [150, 400] as const;
export const XP = { training: 30, steps8k: 10, steps10k: 15, meals: 10, protein: 10, pat: 2 } as const;
export const DAILY_CAP = 65;

export const COACH_IMAGES: Record<CoachPose, ImageSourcePropType> = {
  idle: require('@/assets/pet/coach_idle.webp'),
  blink: require('@/assets/pet/coach_blink.webp'),
  cheer: require('@/assets/pet/coach_cheer.webp'),
  sleep: require('@/assets/pet/coach_sleep.webp'),
  think: require('@/assets/pet/coach_think.webp'),
  wave: require('@/assets/pet/coach_wave.webp'),
  sad: require('@/assets/pet/coach_sad.webp'),
};

export const BUDDY_IMAGES: Record<BuddyKind, Record<Stage, ImageSourcePropType>> = {
  corgi: {
    1: require('@/assets/pet/corgi_1.webp'),
    2: require('@/assets/pet/corgi_2.webp'),
    3: require('@/assets/pet/corgi_3.webp'),
  },
  cat: {
    1: require('@/assets/pet/cat_1.webp'),
    2: require('@/assets/pet/cat_2.webp'),
    3: require('@/assets/pet/cat_3.webp'),
  },
  penguin: {
    1: require('@/assets/pet/penguin_1.webp'),
    2: require('@/assets/pet/penguin_2.webp'),
    3: require('@/assets/pet/penguin_3.webp'),
  },
};

export function isBuddyKind(v: unknown): v is BuddyKind {
  return typeof v === 'string' && (BUDDY_KINDS as readonly string[]).includes(v);
}

export function buddyImage(kind: string, stage: number): ImageSourcePropType {
  const k: BuddyKind = isBuddyKind(kind) ? kind : 'corgi';
  const s = (Math.min(3, Math.max(1, Math.round(stage))) as Stage);
  return BUDDY_IMAGES[k][s];
}
