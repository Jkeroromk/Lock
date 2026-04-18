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
} as const;

export interface UsdaFoodItem {
  fdcId: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * 从 USDA 搜索食物，返回标准化结果
 * 只查 Foundation Food 和 SR Legacy（营养数据最准确）
 */
export async function searchUsda(query: string, maxResults = 5): Promise<UsdaFoodItem[]> {
  if (!USDA_API_KEY) {
    console.warn('USDA_API_KEY 未配置，跳过 USDA 搜索');
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

    foods.push({
      fdcId: String(item.fdcId),
      name: item.description ?? 'Unknown',
      calories: getNutrient(NUTRIENT_IDS.CALORIES),
      protein:  getNutrient(NUTRIENT_IDS.PROTEIN),
      carbs:    getNutrient(NUTRIENT_IDS.CARBS),
      fat:      getNutrient(NUTRIENT_IDS.FAT),
    });
  }

  return foods;
}
