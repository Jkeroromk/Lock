/**
 * Where Lock's health numbers come from. Copied from the app's constants/sources.ts
 * and the i18n `sources.use*` strings (App Review 1.4.1: citations users can find).
 * Keep the two in step when a source is added or changed.
 */
export const SOURCES = [
  { id: "mifflin", use: "Daily calorie estimate (resting energy, Mifflin–St Jeor equation)", useZh: "每日热量估算（静息能量消耗，Mifflin–St Jeor 公式）", citation: "Mifflin MD, St Jeor ST, et al. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr. 1990;51(2):241–247.", url: "https://pubmed.ncbi.nlm.nih.gov/2305711/" },
  { id: "dri-energy", use: "Activity levels and macronutrient ranges", useZh: "活动水平系数和三大营养素范围", citation: "National Academies. Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids. 2005.", url: "https://nap.nationalacademies.org/catalog/10490" },
  { id: "cdc-pace", use: "Weekly pace of weight change", useZh: "每周体重变化速度", citation: "Centers for Disease Control and Prevention (CDC). Steps for Losing Weight.", url: "https://www.cdc.gov/healthy-weight-growth/losing-weight/" },
  { id: "nhlbi-floor", use: "Lowest daily calories we suggest", useZh: "建议的每日最低热量", citation: "National Heart, Lung, and Blood Institute (NIH). Aim for a Healthy Weight: Healthy Eating Plan.", url: "https://www.nhlbi.nih.gov/health/educational/lose_wt/eat/calories" },
  { id: "issn-protein", use: "Protein per kg of body weight", useZh: "每公斤体重的蛋白质摄入量", citation: "Jäger R, Kerksick CM, et al. International Society of Sports Nutrition Position Stand: protein and exercise. J Int Soc Sports Nutr. 2017;14:20.", url: "https://pubmed.ncbi.nlm.nih.gov/28642676/" },
  { id: "dri-water", use: "Daily water goal", useZh: "每日饮水目标", citation: "National Academies. Dietary Reference Intakes for Water, Potassium, Sodium, Chloride, and Sulfate. 2005.", url: "https://nap.nationalacademies.org/catalog/10925" },
  { id: "paluch-steps", use: "Daily step goals", useZh: "每日步数目标", citation: "Paluch AE, et al. Daily steps and all-cause mortality: a meta-analysis of 15 international cohorts. Lancet Public Health. 2022;7(3):e219–e228.", url: "https://pubmed.ncbi.nlm.nih.gov/35247352/" },
  { id: "compendium", use: "Calories burned in workouts", useZh: "训练消耗的热量", citation: "Herrmann SD, et al. 2024 Adult Compendium of Physical Activities: a third update of the energy costs of human activities. J Sport Health Sci. 2024.", url: "https://pubmed.ncbi.nlm.nih.gov/38242596/" },
  { id: "dga", use: "Healthy eating guidance", useZh: "健康饮食指南", citation: "U.S. Department of Agriculture and U.S. Department of Health and Human Services. Dietary Guidelines for Americans.", url: "https://www.dietaryguidelines.gov/" },
  { id: "usda-fdc", use: "Food search nutrition data", useZh: "食物搜索的营养数据", citation: "U.S. Department of Agriculture. FoodData Central.", url: "https://fdc.nal.usda.gov/" },
  { id: "off", use: "Packaged food (barcode) nutrition data", useZh: "包装食品（条形码）的营养数据", citation: "Open Food Facts. Open database of food products.", url: "https://world.openfoodfacts.org/" },
] as const;
