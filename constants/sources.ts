/**
 * Where Lock's health numbers come from (App Review 1.4.1: diet and health
 * information needs citations the user can find). Shown on the Sources screen
 * (app/sources.tsx), linked from Goals, the goals editor, About, the health
 * notice and AI insights.
 *
 * `use` is an i18n key under `sources.` that says what Lock uses it for.
 * Citations stay in English (titles of the original publications).
 */
export interface Source {
  id: string;
  use: string;
  citation: string;
  url: string;
}

export const SOURCES: Source[] = [
  {
    id: 'mifflin',
    use: 'useCalories',
    citation: 'Mifflin MD, St Jeor ST, et al. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr. 1990;51(2):241–247.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/',
  },
  {
    id: 'dri-energy',
    use: 'useActivityMacros',
    citation: 'National Academies. Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids. 2005.',
    url: 'https://nap.nationalacademies.org/catalog/10490',
  },
  {
    id: 'cdc-pace',
    use: 'usePace',
    citation: 'Centers for Disease Control and Prevention (CDC). Steps for Losing Weight.',
    url: 'https://www.cdc.gov/healthy-weight-growth/losing-weight/',
  },
  {
    id: 'nhlbi-floor',
    use: 'useFloor',
    citation: 'National Heart, Lung, and Blood Institute (NIH). Aim for a Healthy Weight: Healthy Eating Plan.',
    url: 'https://www.nhlbi.nih.gov/health/educational/lose_wt/eat/calories',
  },
  {
    id: 'issn-protein',
    use: 'useProtein',
    citation: 'Jäger R, Kerksick CM, et al. International Society of Sports Nutrition Position Stand: protein and exercise. J Int Soc Sports Nutr. 2017;14:20.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/28642676/',
  },
  {
    id: 'dri-water',
    use: 'useWater',
    citation: 'National Academies. Dietary Reference Intakes for Water, Potassium, Sodium, Chloride, and Sulfate. 2005.',
    url: 'https://nap.nationalacademies.org/catalog/10925',
  },
  {
    id: 'paluch-steps',
    use: 'useSteps',
    citation: 'Paluch AE, et al. Daily steps and all-cause mortality: a meta-analysis of 15 international cohorts. Lancet Public Health. 2022;7(3):e219–e228.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/35247352/',
  },
  {
    id: 'compendium',
    use: 'useExercise',
    citation: 'Herrmann SD, et al. 2024 Adult Compendium of Physical Activities: a third update of the energy costs of human activities. J Sport Health Sci. 2024.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/38242596/',
  },
  {
    id: 'dga',
    use: 'useGeneral',
    citation: 'U.S. Department of Agriculture and U.S. Department of Health and Human Services. Dietary Guidelines for Americans.',
    url: 'https://www.dietaryguidelines.gov/',
  },
  {
    id: 'usda-fdc',
    use: 'useFoodData',
    citation: 'U.S. Department of Agriculture. FoodData Central.',
    url: 'https://fdc.nal.usda.gov/',
  },
  {
    id: 'off',
    use: 'useBarcode',
    citation: 'Open Food Facts. Open database of food products.',
    url: 'https://world.openfoodfacts.org/',
  },
];
