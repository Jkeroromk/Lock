/**
 * RevenueCat stub — Apple Developer 账号就绪后替换为真实实现
 * 恢复步骤：
 *   1. npm install react-native-purchases
 *   2. 用 git 恢复此文件原始内容（或参考 ENV_SETUP_GUIDE.md）
 *   3. 在 .env 填入 EXPO_PUBLIC_REVENUECAT_IOS_KEY / ANDROID_KEY
 */

export type Plan = 'free' | 'pro';

// Stub types（与真实 react-native-purchases 保持接口兼容）
export interface PurchasesPackage {
  packageType: string;
  product: { priceString: string; productIdentifier: string };
}

export interface CustomerInfo {
  entitlements: { active: Record<string, unknown> };
}

export interface PurchasesOffering {
  availablePackages: PurchasesPackage[];
}

export function initRevenueCat(_platform: 'ios' | 'android'): void {
  // TODO: enable when Apple Developer account is ready
}

export async function identifyUser(_userId: string): Promise<void> {
  // TODO: enable when Apple Developer account is ready
}

export async function resetUser(): Promise<void> {
  // TODO: enable when Apple Developer account is ready
}

export async function checkProStatus(): Promise<boolean> {
  return false;
}

export async function fetchOfferings(): Promise<PurchasesOffering | null> {
  return null;
}

export async function purchasePackage(_pkg: PurchasesPackage): Promise<CustomerInfo> {
  throw new Error('RevenueCat 尚未启用，请先完成 Apple Developer 账号配置');
}

export async function restorePurchases(): Promise<CustomerInfo> {
  throw new Error('RevenueCat 尚未启用，请先完成 Apple Developer 账号配置');
}
