import AsyncStorage from '@react-native-async-storage/async-storage';

const WATER_KEY = 'lock_water_ml';
const WATER_GOAL_KEY = 'lock_water_goal_ml';

/** One-tap amounts shown on the hydration card. */
export const QUICK_ADD_ML = [150, 250, 350, 500] as const;
export const DEFAULT_WATER_GOAL_ML = 2000;
export const MIN_WATER_GOAL_ML = 500;
export const MAX_WATER_GOAL_ML = 6000;
export const MAX_SINGLE_ADD_ML = 2000;

/** Today's water: total plus each addition, so "undo" removes exactly the last one. */
export interface WaterState {
  ml: number;
  log: number[];
}

const today = () => new Date().toDateString();

export async function loadWater(): Promise<WaterState> {
  try {
    const stored = await AsyncStorage.getItem(WATER_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    if (parsed?.date === today()) {
      return { ml: Number(parsed.ml) || 0, log: Array.isArray(parsed.log) ? parsed.log : [] };
    }
  } catch {}
  const fresh = { ml: 0, log: [] };
  await saveWater(fresh).catch(() => {});
  return fresh;
}

async function saveWater(state: WaterState): Promise<void> {
  await AsyncStorage.setItem(
    WATER_KEY,
    JSON.stringify({ date: today(), ml: Math.max(0, state.ml), log: state.log.slice(-50) })
  );
}

/** Adds an amount (e.g. a glass, or a drink detected from a logged meal). */
export async function addWater(ml: number): Promise<WaterState> {
  const amount = Math.round(Math.min(Math.max(ml, 0), MAX_SINGLE_ADD_ML));
  const current = await loadWater();
  const next = { ml: current.ml + amount, log: [...current.log, amount] };
  await saveWater(next);
  return next;
}

/** Removes the most recent addition. */
export async function undoLastWater(): Promise<WaterState> {
  const current = await loadWater();
  const last = current.log.length ? current.log[current.log.length - 1] : Math.min(250, current.ml);
  const next = { ml: Math.max(0, current.ml - last), log: current.log.slice(0, -1) };
  await saveWater(next);
  return next;
}

export async function loadWaterGoal(): Promise<number> {
  try {
    const stored = Number(await AsyncStorage.getItem(WATER_GOAL_KEY));
    if (stored >= MIN_WATER_GOAL_ML && stored <= MAX_WATER_GOAL_ML) return stored;
  } catch {}
  return DEFAULT_WATER_GOAL_ML;
}

export async function saveWaterGoal(ml: number): Promise<number> {
  const goal = Math.round(Math.min(Math.max(ml, MIN_WATER_GOAL_ML), MAX_WATER_GOAL_ML));
  await AsyncStorage.setItem(WATER_GOAL_KEY, String(goal));
  return goal;
}

/** @deprecated kept for callers that only need the total */
export async function addWaterMl(ml: number): Promise<number> {
  return (await addWater(ml)).ml;
}

// Keyword → estimated ml mapping (multilingual)
const LIQUID_MAP: { keywords: string[]; ml: number }[] = [
  { keywords: ['espresso', '浓缩咖啡', 'エスプレッソ', '에스프레소'], ml: 60 },
  { keywords: ['latte', '拿铁', 'ラテ', '라떼', 'macchiato', 'flat white', 'cortado', 'oat latte'], ml: 250 },
  { keywords: ['cappuccino', '卡布奇诺', 'カプチーノ', '카푸치노'], ml: 180 },
  { keywords: ['americano', '美式', 'アメリカーノ', '아메리카노', 'drip coffee', 'black coffee', '黑咖啡', 'filter coffee'], ml: 300 },
  { keywords: ['coffee', '咖啡', 'コーヒー', '커피', 'mocha', '摩卡'], ml: 240 },
  { keywords: ['matcha', '抹茶', '마차', 'green tea', '绿茶', '緑茶'], ml: 240 },
  { keywords: ['tea', '茶', 'ティー', '차', 'chai', '红茶', '烏龍', 'oolong', 'herbal'], ml: 240 },
  { keywords: ['orange juice', '橙汁', 'apple juice', '苹果汁', 'juice', '果汁', 'ジュース', '주스'], ml: 250 },
  { keywords: ['smoothie', '冰沙', 'スムージー', '스무디', 'protein shake', 'shake', 'milkshake', '奶昔'], ml: 350 },
  { keywords: ['soy milk', '豆浆', 'oat milk', '燕麦奶', 'almond milk', 'milk', '牛奶', 'ミルク', '우유'], ml: 250 },
  { keywords: ['cola', 'coke', '可乐', 'コーラ', '콜라', 'sprite', 'fanta', 'pepsi', 'soda', '汽水', 'soft drink'], ml: 330 },
  { keywords: ['soup', '汤', '湯', 'スープ', '수프', 'broth', '高汤', '清汤', 'miso soup', '味噌汤', '味噌汁'], ml: 300 },
  { keywords: ['ramen', '拉面', '拉麵', 'ラーメン', '라면', 'noodle soup', '汤面'], ml: 400 },
  { keywords: ['beer', '啤酒', 'ビール', '맥주', 'ale', 'lager'], ml: 330 },
  { keywords: ['wine', '红酒', '白酒', 'ワイン', '와인'], ml: 150 },
  { keywords: ['water', '水', 'みず', '물', 'sparkling', '气泡水', 'mineral water'], ml: 250 },
  { keywords: ['energy drink', '能量饮料', 'エナジードリンク', '에너지 드링크', 'red bull', 'monster'], ml: 250 },
];

export function detectLiquidMl(foodName: string): number {
  const lower = foodName.toLowerCase();
  for (const { keywords, ml } of LIQUID_MAP) {
    if (keywords.some((k) => lower.includes(k.toLowerCase()))) return ml;
  }
  return 0;
}
