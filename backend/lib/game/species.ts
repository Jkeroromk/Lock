/**
 * Lockling rules. Keep the app's copy (lib/game/species.ts) in sync when these change.
 * Rewards follow logging and moving, never eating less.
 */
export const SPECIES = ['sprig', 'brawn', 'grano', 'drip', 'puff'] as const;
export type Species = (typeof SPECIES)[number];

export const DAILY_ENCOUNTERS = 3;   // meal + water encounters per local day
export const EGG_STEPS = 5000;       // steps to hatch an egg
export const EVOLVE_DAYS = 7;        // days with a logged meal before the partner evolves
export const SHINY_RATE = 1 / 16;

const VEG = /(沙拉|蔬|菜|果|莓|瓜|番茄|西兰花|菠菜|生菜|萝卜|玉米|salad|veg|vegetable|fruit|apple|banana|berry|berries|orange|grape|melon|tomato|broccoli|spinach|lettuce|kale|carrot|avocado|cucumber|野菜|サラダ|果物|りんご|バナナ|샐러드|채소|야채|과일|사과|바나나)/i;

/** Which creature a meal attracts: vegetables/fruit → grass, protein-heavy → power, carb-heavy → earth. */
export function speciesForMeal(foodName: string, protein: number, carbs: number, fat: number): Species {
  if (VEG.test(foodName)) return 'sprig';
  const p = protein * 4, c = carbs * 4, f = fat * 9, total = p + c + f;
  if (total > 0) {
    if (p / total >= 0.3) return 'brawn';
    if (c / total >= 0.5) return 'grano';
  }
  const pool: Species[] = ['sprig', 'brawn', 'grano'];
  return pool[Math.floor(Math.random() * pool.length)];
}

export const rollShiny = () => Math.random() < SHINY_RATE;
