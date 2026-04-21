import Purchases, {
  LOG_LEVEL,
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

/** 获取 MAX 套餐（来自 'max' offering） */
export async function fetchMaxOffering(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.all['max'] ?? null;
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
