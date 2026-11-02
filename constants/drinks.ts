/**
 * Drinks on the hydration card. `factor` is how much of the drink counts as
 * water (coffee and tea a little less); drinks with calories are also logged
 * as a "drink" meal so the day's calories stay honest. Nutrition per 100 ml.
 */
export type DrinkKind = 'water' | 'sparkling' | 'tea' | 'coffee' | 'latte' | 'milk' | 'juice' | 'sports' | 'soda';

export interface Drink {
  kind: DrinkKind;
  icon: string;
  factor: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const DRINKS: Drink[] = [
  { kind: 'water', icon: 'water-outline', factor: 1, kcal: 0, protein: 0, carbs: 0, fat: 0 },
  { kind: 'sparkling', icon: 'sparkles-outline', factor: 1, kcal: 0, protein: 0, carbs: 0, fat: 0 },
  { kind: 'tea', icon: 'leaf-outline', factor: 0.9, kcal: 0, protein: 0, carbs: 0, fat: 0 },
  { kind: 'coffee', icon: 'cafe-outline', factor: 0.8, kcal: 0, protein: 0, carbs: 0, fat: 0 },
  { kind: 'latte', icon: 'cafe', factor: 0.9, kcal: 54, protein: 3.4, carbs: 5, fat: 2.2 },
  { kind: 'milk', icon: 'pint-outline', factor: 0.9, kcal: 61, protein: 3.2, carbs: 4.8, fat: 3.3 },
  { kind: 'juice', icon: 'nutrition-outline', factor: 0.9, kcal: 45, protein: 0.5, carbs: 10.5, fat: 0.1 },
  { kind: 'sports', icon: 'flash-outline', factor: 0.95, kcal: 25, protein: 0, carbs: 6, fat: 0 },
  { kind: 'soda', icon: 'beer-outline', factor: 0.85, kcal: 42, protein: 0, carbs: 10.6, fat: 0 },
];

export const drinkOf = (kind: string | undefined): Drink => DRINKS.find((d) => d.kind === kind) ?? DRINKS[0];

/** What a cup of `ml` adds: water counted toward the goal, and nutrition. */
export function drinkAmounts(drink: Drink, ml: number) {
  const k = ml / 100;
  return {
    waterMl: Math.round(ml * drink.factor),
    kcal: Math.round(drink.kcal * k),
    protein: Math.round(drink.protein * k * 10) / 10,
    carbs: Math.round(drink.carbs * k * 10) / 10,
    fat: Math.round(drink.fat * k * 10) / 10,
  };
}
