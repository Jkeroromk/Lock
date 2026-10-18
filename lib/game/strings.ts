/** Engine text in the user's language. Placeholders like {name} are filled inside the engine. */
const KEYS = [
  'daysLogged', 'steps', 'today', 'lv', 'dexShort', 'cardHint1', 'cardHint2', 'cardPending', 'cardPendingHint',
  'mealLine', 'waterLine', 'shinyA', 'shinyB', 'shinyTag', 'throwA', 'throwB', 'caughtA', 'caughtB', 'newA', 'newB',
  'hatchReadyA', 'hatchReadyB', 'hatchA', 'hatchB', 'hatchNoteA', 'hatchNoteB', 'newEggA', 'newEggB',
  'unlockA', 'unlockB', 'unlockedA', 'unlockedB', 'greet1a', 'greet1b', 'greet2a', 'greet2b',
  'dexTitle', 'dexBack', 'notMet', 'mysteryHint1', 'mysteryHint2',
  'capture', 'hatch', 'dex', 'dress', 'wild',
  'questMeal', 'questWild', 'questWalk', 'questHatch', 'nextDays', 'allUnlocked',
  'bubbleWild', 'bubbleEgg', 'bubbleIdle1', 'bubbleIdle2', 'bubbleIdle3', 'bubbleNoWild', 'bubbleHome', 'petHi',
] as const;
export const GAME_SPECIES = ['sprig', 'brawn', 'grano', 'drip', 'puff', 'mystery'] as const;

export function engineStrings(t: (key: string) => string) {
  const g = (k: string) => t(`game.${k}`);
  const S: Record<string, unknown> = {};
  for (const k of KEYS) S[k] = g(k);
  S.appear = { sprig: g('appearSprig'), brawn: g('appearBrawn'), grano: g('appearGrano'), drip: g('appearDrip') };
  S.species = Object.fromEntries(GAME_SPECIES.map((sp) => [sp, { name: g(`sp.${sp}.name`), type: g(`sp.${sp}.type`) }]));
  return S;
}
