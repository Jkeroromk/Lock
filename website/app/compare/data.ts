/**
 * Kero Lock next to the calorie apps people ask about. Every competitor fact
 * here comes from a source in SOURCES, checked on CHECKED. Re-check before
 * changing a price; leave a cell out rather than guess.
 */
export const CHECKED = { en: 'November 8, 2026', zh: '2026 年 11 月 8 日' };

export type Lang = 'en' | 'zh';
type T = { en: string; zh: string };

export const APPS = ['kero', 'calai', 'mfp', 'loseit', 'macrofactor'] as const;
export type AppId = (typeof APPS)[number];

export const APP_NAMES: Record<AppId, string> = {
  kero: 'Kero Lock',
  calai: 'Cal AI',
  mfp: 'MyFitnessPal',
  loseit: 'Lose It!',
  macrofactor: 'MacroFactor',
};

/** Cell: text plus the source ids (footnotes) it rests on. */
type Cell = { v: T; src?: string[]; good?: boolean };

export const ROWS: { label: T; cells: Record<AppId, Cell> }[] = [
  {
    label: { en: 'Price (US)', zh: '价格（美区）' },
    cells: {
      kero: { v: { en: '$39.99 / year or $9.99 / month', zh: '$39.99 / 年 或 $9.99 / 月' }, good: true },
      calai: { v: { en: 'App Store lists plans from $2.99 to $29.99', zh: 'App Store 列出的方案 $2.99–$29.99' }, src: ['calai-store'] },
      mfp: { v: { en: 'Premium $79.99 / year · Premium+ $99.99 / year or $24.99 / month', zh: 'Premium $79.99 / 年 · Premium+ $99.99 / 年或 $24.99 / 月' }, src: ['mfp-premium'] },
      loseit: { v: { en: 'Premium from $39.99 / year (other plans listed)', zh: 'Premium $39.99 / 年起（另有其他方案）' }, src: ['loseit-store'] },
      macrofactor: { v: { en: '$71.99 / year, $47.99 / 6 months or $11.99 / month', zh: '$71.99 / 年、$47.99 / 半年 或 $11.99 / 月' }, src: ['mf-site'] },
    },
  },
  {
    label: { en: 'Try it first', zh: '先试用' },
    cells: {
      kero: { v: { en: 'First week is Pro, free. No card needed', zh: '首周 Pro 免费，无需绑卡' }, good: true },
      calai: { v: { en: '3-day trial, payment details up front', zh: '3 天试用，需先填付款信息' }, src: ['calai-eesel'] },
      mfp: { v: { en: '7-day trial for new members', zh: '新用户 7 天试用' }, src: ['mfp-premium'] },
      loseit: { v: { en: 'Free version (see below)', zh: '有免费版（见下）' }, src: ['loseit-store'] },
      macrofactor: { v: { en: '7-day trial', zh: '7 天试用' }, src: ['mf-site'] },
    },
  },
  {
    label: { en: 'Free version', zh: '免费版' },
    cells: {
      kero: { v: { en: 'Yes, for good: 3 AI scans a day, unlimited barcode and manual logging, workouts', zh: '永久免费：每天 3 次 AI 识别，条码和手动记录不限次，训练也免费' }, good: true },
      calai: { v: { en: 'Basic logging; AI photo scans need a subscription', zh: '基础记录；AI 拍照识别需订阅' }, src: ['calai-eesel'] },
      mfp: { v: { en: 'Yes; barcode and meal scan are Premium', zh: '有；扫条码和拍照识别属于 Premium' }, src: ['mfp-premium'] },
      loseit: { v: { en: 'Yes; barcode, photo and voice logging are Premium', zh: '有；扫条码、拍照和语音记录属于 Premium' }, src: ['loseit-store'] },
      macrofactor: { v: { en: 'No free version', zh: '没有免费版' }, src: ['mf-site'] },
    },
  },
  {
    label: { en: 'AI photo logging', zh: 'AI 拍照记录' },
    cells: {
      kero: { v: { en: 'Yes: 3 a day free, unlimited with Pro', zh: '有：免费每天 3 次，Pro 不限' }, good: true },
      calai: { v: { en: 'Yes, with a subscription', zh: '有，需订阅' }, src: ['calai-store', 'calai-eesel'] },
      mfp: { v: { en: 'Yes, Premium (Meal Scan)', zh: '有，Premium（Meal Scan）' }, src: ['mfp-premium'] },
      loseit: { v: { en: 'Yes, Premium', zh: '有，Premium' }, src: ['loseit-store'] },
      macrofactor: { v: { en: 'Yes', zh: '有' }, src: ['mf-site'] },
    },
  },
  {
    label: { en: 'Barcode scanner', zh: '扫条码' },
    cells: {
      kero: { v: { en: 'Free, unlimited', zh: '免费，不限次数' }, good: true },
      calai: { v: { en: 'Free', zh: '免费' }, src: ['calai-eesel'] },
      mfp: { v: { en: 'Premium', zh: 'Premium' }, src: ['mfp-premium'] },
      loseit: { v: { en: 'Premium', zh: 'Premium' }, src: ['loseit-store'] },
      macrofactor: { v: { en: 'Yes (paid app)', zh: '有（付费 App）' }, src: ['mf-site'] },
    },
  },
];

export const SOURCES: { id: string; label: string; url: string }[] = [
  { id: 'calai-store', label: 'Cal AI – Calorie Tracker, US App Store listing (in-app purchases)', url: 'https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616' },
  { id: 'calai-eesel', label: 'eesel AI, “Cal AI pricing 2026: Free plan vs premium” (June 16, 2026)', url: 'https://www.eesel.ai/en/blog/cal-ai-pricing' },
  { id: 'mfp-premium', label: 'MyFitnessPal Premium page', url: 'https://www.myfitnesspal.com/premium' },
  { id: 'loseit-store', label: 'Lose It! – Calorie Counter, US App Store listing (features and in-app purchases)', url: 'https://apps.apple.com/us/app/lose-it-calorie-counter/id297368629' },
  { id: 'mf-site', label: 'MacroFactor website', url: 'https://macrofactor.com/macrofactor/' },
];

/** Where each of the others is the better pick. Honest comparisons get trusted. */
export const PICK_OTHER: Record<Exclude<AppId, 'kero'>, T> = {
  calai: { en: 'You want a photo-first tracker and don’t need workouts or friends in the same app.', zh: '你想要以拍照为主的记录，不需要训练和好友功能。' },
  mfp: { en: 'You want a very large food database and an app that has been around since 2005.', zh: '你想要超大的食物数据库，和一个从 2005 年就在的老牌 App。' },
  loseit: { en: 'You want a long-running, simple calorie budget app.', zh: '你想要一个老牌、简单的热量预算 App。' },
  macrofactor: { en: 'You want an algorithm that adjusts your calories from your weight trend, and you will pay for it.', zh: '你想让算法根据体重趋势自动调整热量，并且愿意付费。' },
};
