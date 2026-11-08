/**
 * Everyday portions for foods in the library (which stores values per 100 g),
 * so people pick "1 apple" instead of guessing grams. Keyed by the library's
 * English name, lower case. Grams are typical, edible part; drinks use ml ≈ g.
 */
export type PortionUnit =
  | 'piece' | 'slice' | 'bowl' | 'cup' | 'can' | 'serving'
  | 'handful' | 'tbsp' | 'box' | 'scoop' | 'bottle';

export interface Portion {
  unit: PortionUnit;
  grams: number;
}

const p = (unit: PortionUnit, grams: number): Portion => ({ unit, grams });

export const FOOD_PORTIONS: Record<string, Portion[]> = {
  // Staples
  'cooked white rice': [p('bowl', 150)],
  'cooked brown rice': [p('bowl', 150)],
  'congee': [p('bowl', 250)],
  'century egg pork congee': [p('bowl', 300)],
  'steamed bun': [p('piece', 100)],
  'steamed twisted bun': [p('piece', 80)],
  'white bread': [p('slice', 30)],
  'whole wheat bread': [p('slice', 30)],
  'cooked noodles': [p('bowl', 250)],
  'stir-fried noodles': [p('serving', 300)],
  'egg fried rice': [p('serving', 300)],
  'yangzhou fried rice': [p('serving', 300)],
  'youtiao fried dough': [p('piece', 50)],
  'rolled oats': [p('serving', 40)],
  'instant oatmeal': [p('bowl', 250)],
  'sweet corn': [p('piece', 150)],
  'sweet potato': [p('piece', 200)],
  'potato': [p('piece', 170)],
  'pork steamed bun': [p('piece', 90)],
  'vegetable steamed bun': [p('piece', 90)],
  'pork dumplings': [p('piece', 20), p('serving', 200)],
  'chive egg dumplings': [p('piece', 20), p('serving', 200)],
  'xiaolongbao': [p('piece', 25), p('serving', 200)],
  'pan-fried dumplings': [p('piece', 30)],
  'spring roll': [p('piece', 30)],
  'sticky rice dumpling': [p('piece', 150)],
  'glutinous rice ball': [p('piece', 20)],
  'five-nut mooncake': [p('piece', 100)],
  'jianbing': [p('piece', 250)],
  // Dishes
  'tomato and egg stir-fry': [p('serving', 200)],
  'kung pao chicken': [p('serving', 200)],
  'mapo tofu': [p('serving', 200)],
  'red braised pork belly': [p('serving', 150)],
  'braised pork ribs': [p('serving', 150)],
  'twice-cooked pork': [p('serving', 150)],
  'fish-flavored pork shreds': [p('serving', 200)],
  'pork with green pepper': [p('serving', 200)],
  'sweet and sour pork tenderloin': [p('serving', 150)],
  'boiled pork slices in spicy broth': [p('serving', 300)],
  'fuqi feipian (beef in chili sauce)': [p('serving', 150)],
  'steamed fish': [p('serving', 250)],
  'fish with sauerkraut': [p('serving', 350)],
  'dry-fried green beans': [p('serving', 200)],
  'stir-fried potato shreds': [p('serving', 200)],
  'three earthen treasures (eggplant, potato, pepper)': [p('serving', 200)],
  'garlic stir-fried greens': [p('serving', 200)],
  'cucumber salad': [p('serving', 150)],
  'char siu bbq pork': [p('serving', 100)],
  'roast duck': [p('serving', 150)],
  'peking duck pancake wrap': [p('piece', 50)],
  'mala hot pot (average)': [p('bowl', 400)],
  'hot pot beef slices': [p('serving', 100)],
  'hot and sour soup': [p('bowl', 250)],
  'egg drop soup': [p('bowl', 250)],
  'tofu pudding': [p('bowl', 250)],
  // Protein
  'chicken breast': [p('piece', 150)],
  'chicken thigh': [p('piece', 100)],
  'beef steak': [p('piece', 200)],
  'salmon': [p('piece', 150)],
  'shrimp': [p('piece', 10), p('serving', 100)],
  'chicken egg': [p('piece', 50)],
  'hard boiled egg': [p('piece', 50)],
  'fried egg': [p('piece', 50)],
  'firm tofu': [p('serving', 100)],
  'soft tofu': [p('serving', 150)],
  'soy milk': [p('cup', 250)],
  'natto': [p('box', 50)],
  // Vegetables
  'tomato': [p('piece', 150)],
  'cucumber': [p('piece', 200)],
  'carrot': [p('piece', 70)],
  'onion': [p('piece', 150)],
  'eggplant': [p('piece', 250)],
  'green pepper': [p('piece', 100)],
  'broccoli': [p('serving', 100)],
  'spinach': [p('serving', 100)],
  'lettuce': [p('serving', 100)],
  // Fruit
  'apple': [p('piece', 180)],
  'banana': [p('piece', 120)],
  'orange': [p('piece', 150)],
  'watermelon': [p('slice', 300)],
  'grapes': [p('cup', 150)],
  'strawberry': [p('piece', 12), p('cup', 150)],
  'mango': [p('piece', 200)],
  'pear': [p('piece', 200)],
  'kiwifruit': [p('piece', 75)],
  'peach': [p('piece', 150)],
  'lychee': [p('piece', 20)],
  'longan': [p('piece', 10)],
  'pomelo': [p('slice', 100)],
  // Dairy
  'whole milk': [p('cup', 250)],
  'skim milk': [p('cup', 250)],
  'whole milk yogurt': [p('cup', 150)],
  'low-fat yogurt': [p('cup', 150)],
  'cheese': [p('slice', 20)],
  'butter': [p('tbsp', 14)],
  // Nuts & snacks
  'peanuts': [p('handful', 30)],
  'walnuts': [p('handful', 30)],
  'almonds': [p('handful', 30)],
  'cashews': [p('handful', 30)],
  'sunflower seeds': [p('handful', 30)],
  'potato chips': [p('serving', 30)],
  'french fries': [p('serving', 110)],
  'oreo cookies': [p('piece', 11)],
  'cake': [p('slice', 80)],
  'chocolate': [p('serving', 40)],
  'ice cream': [p('scoop', 70)],
  'jelly': [p('cup', 100)],
  // Drinks
  'coca-cola': [p('can', 330)],
  'sprite': [p('can', 330)],
  'orange juice': [p('cup', 250)],
  'green tea': [p('cup', 250)],
  'bubble milk tea (full sugar)': [p('cup', 500)],
  'americano': [p('cup', 350)],
  'latte': [p('cup', 350)],
  'beer': [p('can', 330)],
  'red wine': [p('cup', 150)],
  'coconut water': [p('cup', 330)],
  'sports drink': [p('bottle', 600)],
  // Fast food
  'hamburger': [p('piece', 180)],
  'cheeseburger': [p('piece', 180)],
  'chicken nuggets': [p('piece', 18)],
  'cheese pizza': [p('slice', 110)],
  'sandwich': [p('piece', 200)],
  'vegetable salad': [p('serving', 200)],
  'caesar salad': [p('serving', 200)],
};

/** Portions for a library food (empty when we don't know one). */
export function portionsFor(nameEn: string | null | undefined): Portion[] {
  if (!nameEn) return [];
  return FOOD_PORTIONS[nameEn.trim().toLowerCase()] ?? [];
}
