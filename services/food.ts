import axios from 'axios';
import { api } from './client';
import { toCompressedBase64 } from '@/lib/image';

export interface FoodAnalysis {
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  /** Product photo (barcode lookups). */
  imageUrl?: string;
}

export interface MealData {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image_url: string;
  /** Base64 JPEG thumbnail; the server keeps it in Supabase Storage. */
  thumbnail?: string;
  /** 补记: when it was eaten (ISO). Omitted = now. */
  eaten_at?: string;
}

export interface MealRecord {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image_url: string;
  created_at: string;
}

export interface WeeklyDay {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MonthlyData {
  [dateString: string]: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface MealExportRecord {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
}

const getLocalDateParams = () => {
  const now = new Date();
  const date = now.toLocaleDateString('en-CA');
  const tzOffset = now.getTimezoneOffset();
  return { date, tzOffset };
};

export const analyzeFoodImage = async (
  imageUri: string,
  lang?: string,
  mode: 'food' | 'label' = 'food',
): Promise<FoodAnalysis> => {
  try {
    // 1024px is plenty for food / label recognition and keeps the request ~200 KB.
    const base64 = await toCompressedBase64(imageUri, { maxWidth: 1024, quality: 0.7 });
    const response = await api.post<FoodAnalysis>(
      '/api/vision',
      { image: base64, lang: lang ?? 'en-US', mode },
      { timeout: 60_000 } // AI analysis can take longer than the default API timeout
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Image analysis failed');
  }
};

export const deleteMeal = async (mealId: string): Promise<void> => {
  try {
    await api.delete(`/api/meals/${mealId}`);
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '删除餐食失败');
  }
};

export const updateMeal = async (
  mealId: string,
  data: Partial<{ food_name: string; calories: number; protein: number; carbs: number; fat: number }>,
): Promise<void> => {
  try {
    await api.patch(`/api/meals/${mealId}`, data);
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '更新餐食失败');
  }
};

/** OFF numbers can arrive as strings; anything unusable becomes undefined. */
const offNum = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/**
 * Open Food Facts lookup. Values are for one serving when the product says
 * what a serving is, otherwise per 100 g — never a mix of the two (the old
 * code took kcal per serving but protein per 100 g when one was missing).
 */
export const lookupBarcode = async (barcode: string, lang?: string): Promise<FoodAnalysis | null> => {
  try {
    const response = await axios.get(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
      { headers: { 'User-Agent': 'LockApp/1.0 (health tracking)' }, timeout: 8000 },
    );
    const product = response.data?.product;
    if (!product) return null;
    const n = product.nutriments ?? {};

    // kcal for a basis ("serving" | "100g"), falling back to kJ.
    const kcal = (basis: string) => {
      const direct = offNum(n[`energy-kcal_${basis}`]);
      if (direct !== undefined) return direct;
      const kj = offNum(n[`energy-kj_${basis}`]) ?? offNum(n[`energy_${basis}`]);
      return kj !== undefined ? kj / 4.184 : undefined;
    };

    const servingG = offNum(product.serving_quantity);
    const per100 = {
      calories: kcal('100g'),
      protein: offNum(n.proteins_100g),
      carbs: offNum(n.carbohydrates_100g),
      fat: offNum(n.fat_100g),
    };
    const perServing = {
      calories: kcal('serving'),
      protein: offNum(n.proteins_serving),
      carbs: offNum(n.carbohydrates_serving),
      fat: offNum(n.fat_serving),
    };
    const scale = servingG && servingG > 0 && servingG < 2000 ? servingG / 100 : null;

    let values: { calories?: number; protein?: number; carbs?: number; fat?: number };
    let basisLabel: string;
    if (perServing.calories !== undefined || scale) {
      // One serving: use the label's per-serving figure, else scale per-100 g.
      const pick = (k: keyof typeof per100) =>
        perServing[k] ?? (scale && per100[k] !== undefined ? per100[k]! * scale : undefined);
      values = { calories: pick('calories'), protein: pick('protein'), carbs: pick('carbs'), fat: pick('fat') };
      basisLabel = String(product.serving_size || (servingG ? `${servingG} g` : '')).trim();
    } else {
      values = per100;
      basisLabel = '100 g';
    }

    const protein = values.protein ?? 0;
    const carbs = values.carbs ?? 0;
    const fat = values.fat ?? 0;
    // Missing energy but macros present: 4/4/9.
    const calories = values.calories ?? (protein || carbs || fat ? protein * 4 + carbs * 4 + fat * 9 : 0);

    const short = (lang || 'en').slice(0, 2).toLowerCase();
    const baseName: string = (
      product[`product_name_${short}`] || product.product_name_en || product.product_name ||
      product.generic_name || product.abbreviated_product_name || ''
    ).trim();
    if (!baseName) return null;
    const brand = String(product.brands || '').split(',')[0].trim();
    const named = brand && !baseName.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${baseName}` : baseName;
    const food = basisLabel ? `${named} (${basisLabel})` : named;

    const imageUrl: string | undefined =
      product.image_front_small_url || product.image_front_url || product.image_small_url || product.image_url || undefined;

    const r1 = (v: number) => Math.round(v * 10) / 10;
    return {
      food,
      calories: Math.round(calories),
      protein: r1(protein),
      carbs: r1(carbs),
      fat: r1(fat),
      confidence: values.calories !== undefined ? 0.95 : 0.6,
      imageUrl: typeof imageUrl === 'string' && imageUrl.startsWith('https://') ? imageUrl : undefined,
    };
  } catch {
    return null;
  }
};

export const logMeal = async (meal: MealData): Promise<void> => {
  try {
    const tzOffset = new Date().getTimezoneOffset();
    await api.post('/api/log-meal', { ...meal, tzOffset });
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '保存餐食失败');
  }
};

export const fetchTodayData = async (): Promise<{ totalCalories: number; meals: MealRecord[] }> => {
  try {
    const { date, tzOffset } = getLocalDateParams();
    const response = await api.get(`/api/today?date=${date}&tzOffset=${tzOffset}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '获取今日数据失败');
  }
};

export const fetchDayMeals = async (date: string): Promise<{ totalCalories: number; meals: MealRecord[] }> => {
  try {
    const { tzOffset } = getLocalDateParams();
    const response = await api.get(`/api/today?date=${date}&tzOffset=${tzOffset}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '获取当日数据失败');
  }
};

export const fetchWeeklyData = async (): Promise<WeeklyDay[]> => {
  try {
    const { date, tzOffset } = getLocalDateParams();
    const response = await api.get<WeeklyDay[]>(`/api/weekly?date=${date}&tzOffset=${tzOffset}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '获取周数据失败');
  }
};

export const fetchMonthlyData = async (year: number, month: number): Promise<MonthlyData> => {
  try {
    const { tzOffset } = getLocalDateParams();
    const response = await api.get<MonthlyData>('/api/monthly', { params: { year, month, tzOffset } });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '获取月度数据失败');
  }
};

export const fetchAllMealsForExport = async (): Promise<MealExportRecord[]> => {
  const res = await api.get<MealExportRecord[]>('/api/meals/export');
  return res.data;
};

/**
 * Meals for the CSV export, limited to local days `from`..`to` (YYYY-MM-DD,
 * inclusive; omit for everything) and with food names translated into `lang`
 * (omit to keep them as logged). `complete` is false when some names couldn't
 * be translated and kept their logged name.
 */
export const fetchMealsForExport = async (opts: { from?: string; to?: string; lang?: string }): Promise<{
  meals: MealExportRecord[];
  translated: boolean;
  complete: boolean;
}> => {
  const params: Record<string, string> = { v: '2' };
  if (opts.from) params.from = opts.from;
  if (opts.to) params.to = opts.to;
  if (opts.lang) params.lang = opts.lang;
  // Translating hundreds of names can take a while.
  const res = await api.get('/api/meals/export', { params, timeout: 90_000 });
  return res.data;
};

/** A food from the library (per 100 g). */
export interface LibraryFood {
  id: string;
  name: string;
  nameEn: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: 'LOCAL' | 'USDA' | string;
}

export const searchFoods = async (q: string): Promise<LibraryFood[]> => {
  const res = await api.get<{ results: LibraryFood[] }>('/api/food-search', { params: { q } });
  return res.data.results ?? [];
};

/** Something this person has logged before, per single serving. */
export interface RecentFood {
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  count: number;
  last_at: string;
  /** Display only (may be a signed URL that expires). */
  image_url: string | null;
  /** True when image_url is a product photo that can be saved with the meal again. */
  reuse_image: boolean;
}

export const fetchRecentFoods = async (): Promise<RecentFood[]> => {
  const res = await api.get<{ items: RecentFood[] }>('/api/meals/recent');
  return res.data.items ?? [];
};

/** "一个苹果加两片吐司" → nutrition. Uses the daily AI allowance. Throws Error('AI_LIMIT_REACHED' | 'NOT_FOOD' | …). */
export const describeMeal = async (text: string, lang?: string): Promise<FoodAnalysis> => {
  try {
    const res = await api.post<FoodAnalysis>('/api/ai/describe-meal', { text, lang: lang ?? 'en-US' }, { timeout: 60_000 });
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Analysis failed');
  }
};
