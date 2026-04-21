export type PlanTier = 'FREE' | 'PRO' | 'MAX';

export interface PlanFeatures {
  /** 每日 AI 识别次数（-1 = 无限） */
  dailyAiCalls: number;
  /** AI 饮食分析（手动触发） */
  aiDietAnalysis: boolean;
  /** 最多好友数（-1 = 无限） */
  maxFriends: number;
  /** 创建挑战赛 */
  createChallenge: boolean;
  /** 数据导出 */
  exportData: boolean;
  /** 体重趋势图 */
  weightChart: boolean;
  /** 每周自动 AI 报告 */
  weeklyAiReport: boolean;
  /** AI 自定义营养目标 */
  customNutritionPlan: boolean;
  /** 优先客服 */
  prioritySupport: boolean;
}

export const PLAN_FEATURES: Record<PlanTier, PlanFeatures> = {
  FREE: {
    dailyAiCalls: 3,
    aiDietAnalysis: false,
    maxFriends: 5,
    createChallenge: false,
    exportData: false,
    weightChart: false,
    weeklyAiReport: false,
    customNutritionPlan: false,
    prioritySupport: false,
  },
  PRO: {
    dailyAiCalls: -1,
    aiDietAnalysis: true,
    maxFriends: -1,
    createChallenge: true,
    exportData: true,
    weightChart: true,
    weeklyAiReport: false,
    customNutritionPlan: false,
    prioritySupport: false,
  },
  MAX: {
    dailyAiCalls: -1,
    aiDietAnalysis: true,
    maxFriends: -1,
    createChallenge: true,
    exportData: true,
    weightChart: true,
    weeklyAiReport: true,
    customNutritionPlan: true,
    prioritySupport: true,
  },
};

export type Feature = keyof PlanFeatures;

export function hasFeature(plan: PlanTier, feature: Feature): boolean {
  const value = PLAN_FEATURES[plan][feature];
  if (typeof value === 'boolean') return value;
  return (value as number) !== 0;
}

export function getQuota(plan: PlanTier, feature: Feature): number {
  const value = PLAN_FEATURES[plan][feature];
  if (typeof value === 'boolean') return value ? -1 : 0;
  return value as number;
}

export function getPlanLabel(plan: PlanTier): string {
  const labels: Record<PlanTier, string> = { FREE: '免费版', PRO: 'Pro', MAX: 'Max' };
  return labels[plan];
}

export function isPaidPlan(plan: PlanTier): boolean {
  return plan === 'PRO' || plan === 'MAX';
}
