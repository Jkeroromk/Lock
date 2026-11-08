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

/**
 * What you get without paying.
 * free: included at $0 · limited: some of it at $0 · paid: subscription only · none: not offered.
 */
export type Level = 'free' | 'limited' | 'paid' | 'none';
type Mark = { level: Level; v: T; src?: string[] };

export const FREE_COLUMNS: { id: 'version' | 'photo' | 'barcode'; label: T }[] = [
  { id: 'version', label: { en: 'Free version', zh: '免费版' } },
  { id: 'photo', label: { en: 'AI photo logging', zh: 'AI 拍照记录' } },
  { id: 'barcode', label: { en: 'Barcode scanner', zh: '扫条码' } },
];

export const FREE_BOARD: Record<AppId, Record<'version' | 'photo' | 'barcode', Mark>> = {
  kero: {
    version: { level: 'free', v: { en: 'Yes', zh: '有' } },
    photo: { level: 'free', v: { en: '3 a day', zh: '每天 3 次' } },
    barcode: { level: 'free', v: { en: 'Free', zh: '免费' } },
  },
  calai: {
    version: { level: 'limited', v: { en: 'Basic', zh: '基础' }, src: ['calai-eesel'] },
    photo: { level: 'paid', v: { en: 'Paid', zh: '付费' }, src: ['calai-eesel'] },
    barcode: { level: 'free', v: { en: 'Free', zh: '免费' }, src: ['calai-eesel'] },
  },
  mfp: {
    version: { level: 'free', v: { en: 'Yes', zh: '有' }, src: ['mfp-premium'] },
    photo: { level: 'paid', v: { en: 'Premium', zh: 'Premium' }, src: ['mfp-premium'] },
    barcode: { level: 'paid', v: { en: 'Premium', zh: 'Premium' }, src: ['mfp-premium'] },
  },
  loseit: {
    version: { level: 'free', v: { en: 'Yes', zh: '有' }, src: ['loseit-store'] },
    photo: { level: 'paid', v: { en: 'Premium', zh: 'Premium' }, src: ['loseit-store'] },
    barcode: { level: 'paid', v: { en: 'Premium', zh: 'Premium' }, src: ['loseit-store'] },
  },
  macrofactor: {
    version: { level: 'none', v: { en: 'No', zh: '无' }, src: ['mf-site'] },
    photo: { level: 'paid', v: { en: 'Paid', zh: '付费' }, src: ['mf-site'] },
    barcode: { level: 'paid', v: { en: 'Paid', zh: '付费' }, src: ['mf-site'] },
  },
};

/** What each costs (US) and how you can try it. */
export const PRICES: Record<AppId, { price: T; trial: T; src?: string[] }> = {
  kero: {
    price: { en: '$39.99 a year, or $9.99 a month', zh: '每年 $39.99，或每月 $9.99' },
    trial: { en: 'First week is Pro, free. No card needed.', zh: '首周 Pro 免费，不用绑卡。' },
  },
  calai: {
    price: { en: 'Plans from $2.99 to $29.99 on the App Store', zh: 'App Store 上的方案 $2.99–$29.99' },
    trial: { en: '3-day trial, payment details first', zh: '3 天试用，需先填付款信息' },
    src: ['calai-store', 'calai-eesel'],
  },
  mfp: {
    price: { en: 'Premium $79.99 a year. Premium+ $99.99 a year or $24.99 a month', zh: 'Premium 每年 $79.99；Premium+ 每年 $99.99 或每月 $24.99' },
    trial: { en: '7-day trial for new members', zh: '新用户 7 天试用' },
    src: ['mfp-premium'],
  },
  loseit: {
    price: { en: 'Premium from $39.99 a year', zh: 'Premium 每年 $39.99 起' },
    trial: { en: 'Free version to start', zh: '可先用免费版' },
    src: ['loseit-store'],
  },
  macrofactor: {
    price: { en: '$71.99 a year, $47.99 for 6 months, or $11.99 a month', zh: '每年 $71.99、半年 $47.99，或每月 $11.99' },
    trial: { en: '7-day trial', zh: '7 天试用' },
    src: ['mf-site'],
  },
};

export const SOURCES: { id: string; label: string; url: string }[] = [
  { id: 'calai-store', label: 'Cal AI – Calorie Tracker, US App Store listing (in-app purchases)', url: 'https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616' },
  { id: 'calai-eesel', label: 'eesel AI, “Cal AI pricing 2026: Free plan vs premium” (June 16, 2026, third-party)', url: 'https://www.eesel.ai/en/blog/cal-ai-pricing' },
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
