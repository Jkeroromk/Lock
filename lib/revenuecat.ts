import Purchases, {
  LOG_LEVEL,
  INTRO_ELIGIBILITY_STATUS,
  type PurchasesPackage,
  type CustomerInfo,
  type PurchasesOffering,
} from 'react-native-purchases';
import type { PlanTier } from '@/store/useStore';

export type Plan = 'free' | 'pro' | 'max';
export type { PurchasesPackage, CustomerInfo, PurchasesOffering };

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';

export function initRevenueCat(platform: 'ios' | 'android'): void {
  const key = platform === 'ios' ? IOS_KEY : '';
  if (!key) return;
  Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: key });
}

export async function identifyUser(userId: string): Promise<void> {
  await Purchases.logIn(userId);
}

export async function resetUser(): Promise<void> {
  try { await Purchases.logOut(); } catch {}
}

/** 从 CustomerInfo 推断当前 plan tier */
export function planFromCustomerInfo(info: CustomerInfo): PlanTier {
  if (info.entitlements.active['max'] !== undefined) return 'MAX';
  if (info.entitlements.active['pro'] !== undefined) return 'PRO';
  return 'FREE';
}

export async function checkProStatus(): Promise<boolean> {
  const info = await Purchases.getCustomerInfo();
  const plan = planFromCustomerInfo(info);
  return plan === 'PRO' || plan === 'MAX';
}

export async function getActivePlan(): Promise<PlanTier> {
  const info = await Purchases.getCustomerInfo();
  return planFromCustomerInfo(info);
}

/** 获取 PRO 套餐（来自 'pro' offering 或当前 offering） */
export async function fetchProOffering(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.all['pro'] ?? offerings.current;
}

/** Lock Pro's two plans from the Pro offering (annual is the one we lead with). */
export interface ProPackages {
  annual: PurchasesPackage | null;
  monthly: PurchasesPackage | null;
  /** Which offering the packages came from (diagnostics). */
  offeringId: string | null;
}

export async function fetchProPackages(): Promise<ProPackages> {
  const offering = await fetchProOffering();
  const pkgs = offering?.availablePackages ?? [];
  return {
    annual: offering?.annual ?? pkgs.find((p) => p.packageType === 'ANNUAL') ?? null,
    monthly: offering?.monthly ?? pkgs.find((p) => p.packageType === 'MONTHLY') ?? null,
    offeringId: offering?.identifier ?? null,
  };
}

/**
 * Free-trial length (days) this user would actually get on `pkg`; 0 when the
 * product has no free trial or the user already used it (Apple: one trial per
 * subscription group). Shown on the paywall, so it must be accurate.
 */
export async function freeTrialDays(pkg: PurchasesPackage | null): Promise<number> {
  const intro = pkg?.product.introPrice;
  if (!pkg || !intro || intro.price !== 0) return 0;
  try {
    const result = await Purchases.checkTrialOrIntroductoryPriceEligibility([pkg.product.identifier]);
    const status = result[pkg.product.identifier]?.status;
    if (status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE) return 0;
  } catch {}
  const n = intro.periodNumberOfUnits;
  switch (intro.periodUnit) {
    case 'DAY': return n;
    case 'WEEK': return n * 7;
    case 'MONTH': return n * 30;
    default: return n * 365;
  }
}

/** How much cheaper the annual plan is than 12 monthly payments, in whole percent. */
export function annualSavingsPercent(annual: PurchasesPackage | null, monthly: PurchasesPackage | null): number | null {
  if (!annual || !monthly || monthly.product.price <= 0) return null;
  const pct = Math.round((1 - annual.product.price / (monthly.product.price * 12)) * 100);
  return pct > 0 ? pct : null;
}

/** 兼容旧接口，返回当前 offering（PRO） */
export async function fetchOfferings(): Promise<PurchasesOffering | null> {
  return fetchProOffering();
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return await Purchases.restorePurchases();
}
