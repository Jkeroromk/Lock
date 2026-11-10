/**
 * USDA FoodData Central API 工具
 * 文档：https://fdc.nal.usda.gov/api-guide.html
 * 免费 API Key 申请：https://fdc.nal.usda.gov/api-key-signup.html
 */

const USDA_API_KEY = process.env.USDA_API_KEY;
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

// USDA nutrientId 映射
const NUTRIENT_IDS = {
  CALORIES: 1008, // Energy (kcal)
  PROTEIN:  1003, // Protein
  CARBS:    1005, // Carbohydrate, by difference
  FAT:      1004, // Total lipid (fat)
  FIBER:    1079, // Fiber, total dietary (g)
  SODIUM:   1093, // Sodium, Na (mg)
} as const;

export interface UsdaFoodItem {
  fdcId: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** g per 100 g; null when USDA has no value. */
  fiber: number | null;
  /** mg per 100 g; null when USDA has no value. */
  sodium: number | null;
}

/**
 * 从 USDA 搜索食物，返回标准化结果
 * 只查 Foundation Food 和 SR Legacy（营养数据最准确）
 */
export async function searchUsda(query: string, maxResults = 5): Promise<UsdaFoodItem[]> {
  if (!USDA_API_KEY) {
    return [];
  }

  const url = new URL(`${USDA_BASE_URL}/foods/search`);
  url.searchParams.set('api_key', USDA_API_KEY);
  url.searchParams.set('query', query);
  url.searchParams.set('dataType', 'Foundation,SR Legacy');
  url.searchParams.set('pageSize', String(maxResults));

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(8000), // 8 秒超时
  });

  if (!res.ok) {
    throw new Error(`USDA API 请求失败: ${res.status}`);
  }

  const data = await res.json();
  const foods: UsdaFoodItem[] = [];

  for (const item of data.foods ?? []) {
    const getNutrient = (id: number): number => {
      const n = (item.foodNutrients ?? []).find((fn: any) => fn.nutrientId === id);
      return n ? Math.round(Number(n.value) * 10) / 10 : 0;
    };
    const optional = (id: number): number | null => {
      const n = (item.foodNutrients ?? []).find((fn: any) => fn.nutrientId === id);
      const v = n ? Number(n.value) : NaN;
      return Number.isFinite(v) && v >= 0 ? Math.round(v * 10) / 10 : null;
    };

    foods.push({
      fdcId: String(item.fdcId),
      name: item.description ?? 'Unknown',
      calories: getNutrient(NUTRIENT_IDS.CALORIES),
      protein:  getNutrient(NUTRIENT_IDS.PROTEIN),
      carbs:    getNutrient(NUTRIENT_IDS.CARBS),
      fat:      getNutrient(NUTRIENT_IDS.FAT),
      fiber:    optional(NUTRIENT_IDS.FIBER),
      sodium:   optional(NUTRIENT_IDS.SODIUM),
    });
  }

  return foods;
}
