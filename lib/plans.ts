export type PlanTier = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface PlanFeatures {
  /** 每日 AI 识别次数（-1 = 无限） */
  dailyAiCalls: number;
  /** AI 饮食分析 */
  aiDietAnalysis: boolean;
  /** 最多好友数（-1 = 无限） */
  maxFriends: number;
  /** 创建挑战赛 */
  createChallenge: boolean;
  /** 数据导出 */
  exportData: boolean;
  /** 体重趋势图（高级） */
  weightChart: boolean;
}

export const PLAN_FEATURES: Record<PlanTier, PlanFeatures> = {
  FREE: {
    dailyAiCalls: 3,
    aiDietAnalysis: false,
    maxFriends: 5,
    createChallenge: false,
    exportData: false,
    weightChart: false,
  },
  PRO: {
    dailyAiCalls: -1,
    aiDietAnalysis: true,
    maxFriends: -1,
    createChallenge: true,
    exportData: true,
    weightChart: true,
  },
  ENTERPRISE: {
    dailyAiCalls: -1,
    aiDietAnalysis: true,
    maxFriends: -1,
    createChallenge: true,
    exportData: true,
    weightChart: true,
  },
};

export type Feature = keyof PlanFeatures;

export function hasFeature(plan: PlanTier, feature: Feature): boolean {
  const value = PLAN_FEATURES[plan][feature];
  if (typeof value === 'boolean') return value;
  // -1 = unlimited = true; 0 = blocked = false; >0 = has quota = true
  return (value as number) !== 0;
}

/** 获取某功能的配额数量（-1 = 无限） */
export function getQuota(plan: PlanTier, feature: Feature): number {
  const value = PLAN_FEATURES[plan][feature];
  if (typeof value === 'boolean') return value ? -1 : 0;
  return value as number;
}

/** 返回计划的显示名称 */
export function getPlanLabel(plan: PlanTier): string {
  const labels: Record<PlanTier, string> = {
    FREE: '免费版',
    PRO: 'Pro',
    ENTERPRISE: '企业版',
  };
  return labels[plan];
}
