import AsyncStorage from '@react-native-async-storage/async-storage';

const WATER_KEY = 'lock_water_ml';
export const GLASS_ML = 250;
export const WATER_GOAL_ML = 2000;

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

export async function loadWaterMl(): Promise<number> {
  try {
    const today = new Date().toDateString();
    const stored = await AsyncStorage.getItem(WATER_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    if (parsed?.date === today) return parsed.ml ?? 0;
    await AsyncStorage.setItem(WATER_KEY, JSON.stringify({ date: today, ml: 0 }));
    return 0;
  } catch {
    return 0;
  }
}

export async function saveWaterMl(ml: number): Promise<void> {
  const today = new Date().toDateString();
  await AsyncStorage.setItem(WATER_KEY, JSON.stringify({ date: today, ml: Math.max(0, ml) }));
}

export async function addWaterMl(ml: number): Promise<number> {
  const current = await loadWaterMl();
  const next = current + ml;
  await saveWaterMl(next);
  return next;
}
