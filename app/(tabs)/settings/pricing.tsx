import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import {
  fetchOfferings,
  purchasePackage,
  restorePurchases,
  type PurchasesPackage,
} from '@/lib/revenuecat';
import { syncSubscriptionPlan } from '@/services/api';

export default function PricingScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { t } = useTranslation();
  const { user, setPlan } = useStore();

  const [proPackage, setProPackage] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const currentPlan = user?.plan ?? 'FREE';
  const isPro = currentPlan === 'PRO' || currentPlan === 'ENTERPRISE';

  useEffect(() => {
    loadOfferings();
  }, []);

  async function loadOfferings() {
    setLoading(true);
    try {
      const offering = await fetchOfferings();
      const pkg = offering?.availablePackages?.[0] ?? null;
      setProPackage(pkg);
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase() {
    if (!proPackage) {
      Alert.alert(t('pricing.noPackages' as any), t('pricing.tryLater' as any));
      return;
    }
    setPurchasing(true);
    try {
      const info = await purchasePackage(proPackage);
      const isActive = info.entitlements.active['pro'] !== undefined;
      if (isActive) {
        setPlan('PRO');
        await syncSubscriptionPlan('PRO');
        Alert.alert(t('pricing.purchaseSuccess' as any), t('pricing.purchaseSuccessMsg' as any), [
          { text: t('common.confirm'), onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      if (err.userCancelled) return;
      Alert.alert(t('pricing.purchaseFailed' as any), err.message || t('common.retry'));
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      const info = await restorePurchases();
      const isProNow = info.entitlements.active['pro'] !== undefined;
      if (isProNow) {
        setPlan('PRO');
        await syncSubscriptionPlan('PRO');
        Alert.alert(t('pricing.restoreSuccess' as any), t('pricing.restoreSuccessMsg' as any));
      } else {
        Alert.alert(t('pricing.noRestoreFound' as any), t('pricing.noRestoreMsg' as any));
      }
    } catch (err: any) {
      Alert.alert(t('pricing.restoreFailed' as any), err.message || t('common.retry'));
    } finally {
      setRestoring(false);
    }
  }

  const periodLabel = proPackage?.packageType === 'ANNUAL'
    ? t('pricing.annual' as any)
    : t('pricing.monthly' as any);

  const priceLabel = proPackage
    ? `${proPackage.product.priceString} / ${periodLabel}`
    : t('pricing.loading' as any);

  const freeFeatures: string[] = t('pricing.freeFeatures' as any) as any;
  const proFeatures: string[] = t('pricing.proFeatures' as any) as any;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: DIMENSIONS.CARD_PADDING,
        paddingVertical: DIMENSIONS.SPACING,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: DIMENSIONS.SPACING }}>
          <Ionicons name="chevron-back" size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: colors.textPrimary }}>
          {t('pricing.title' as any)}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingBottom: DIMENSIONS.SPACING }}
        showsVerticalScrollIndicator={false}
      >
        {isPro && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#F59E0B22', borderRadius: 12,
            paddingVertical: DIMENSIONS.SPACING * 0.6,
            marginBottom: DIMENSIONS.SPACING * 1.2,
            gap: 6,
          }}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: '#F59E0B' }}>
              {t('pricing.currentPro' as any)}
            </Text>
          </View>
        )}

        {/* FREE card */}
        <View style={{
          borderRadius: 20, padding: DIMENSIONS.SPACING * 1.2,
          backgroundColor: colors.cardBackground,
          borderWidth: 2, borderColor: colors.borderPrimary,
          marginBottom: DIMENSIONS.SPACING,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: DIMENSIONS.SPACING }}>
            <Text style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: colors.textPrimary }}>
              {t('pricing.free' as any)}
            </Text>
            <View style={{ paddingHorizontal: 12, paddingVertical: 4, backgroundColor: colors.cardBackgroundSecondary, borderRadius: 8 }}>
              <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textSecondary }}>
                {!isPro ? t('pricing.currentPlan' as any) : t('pricing.basic' as any)}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: TYPOGRAPHY.titleL, fontWeight: '900', color: colors.textPrimary, marginBottom: DIMENSIONS.SPACING }}>
            $0
          </Text>
          {Array.isArray(freeFeatures) && freeFeatures.map((f) => (
            <View key={f} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
              <Ionicons name="checkmark-circle" size={16} color={colors.textSecondary} />
              <Text style={{ fontSize: TYPOGRAPHY.bodyS, color: colors.textSecondary }}>{f}</Text>
            </View>
          ))}
        </View>

        {/* PRO card */}
        <View style={{
          borderRadius: 20, padding: DIMENSIONS.SPACING * 1.2,
          backgroundColor: colors.textPrimary,
          borderWidth: 2, borderColor: colors.textPrimary,
          marginBottom: DIMENSIONS.SPACING,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: DIMENSIONS.SPACING }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: colors.backgroundPrimary }}>Pro</Text>
            </View>
            {isPro && (
              <View style={{ paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#F59E0B33', borderRadius: 8 }}>
                <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: '#F59E0B' }}>
                  {t('pricing.currentPlan' as any)}
                </Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: TYPOGRAPHY.titleL, fontWeight: '900', color: colors.backgroundPrimary, marginBottom: 4 }}>
            {loading ? '—' : priceLabel}
          </Text>
          <Text style={{ fontSize: TYPOGRAPHY.bodyXS, color: colors.backgroundPrimary, opacity: 0.6, marginBottom: DIMENSIONS.SPACING }}>
            {t('pricing.cancelAnytime' as any)}
          </Text>
          {Array.isArray(proFeatures) && proFeatures.map((f) => (
            <View key={f} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
              <Ionicons name="checkmark-circle" size={16} color="#F59E0B" />
              <Text style={{ fontSize: TYPOGRAPHY.bodyS, color: colors.backgroundPrimary }}>{f}</Text>
            </View>
          ))}
        </View>

        {!isPro && (
          <TouchableOpacity
            onPress={handlePurchase}
            disabled={purchasing || loading}
            style={{
              borderRadius: 16, paddingVertical: DIMENSIONS.SPACING,
              backgroundColor: '#F59E0B', alignItems: 'center',
              marginTop: DIMENSIONS.SPACING * 1.5,
              marginBottom: DIMENSIONS.SPACING * 0.6,
              opacity: purchasing || loading ? 0.7 : 1,
            }}
          >
            {purchasing
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: '#fff' }}>
                  {t('pricing.upgradeToPro' as any)}
                </Text>
            }
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleRestore}
          disabled={restoring}
          style={{ alignItems: 'center', paddingVertical: DIMENSIONS.SPACING * 0.5 }}
        >
          {restoring
            ? <ActivityIndicator size="small" color={colors.textSecondary} />
            : <Text style={{ fontSize: TYPOGRAPHY.bodyXS, color: colors.textSecondary, fontWeight: '600' }}>
                {t('pricing.restorePurchase' as any)}
              </Text>
          }
        </TouchableOpacity>

        <Text style={{
          fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary,
          textAlign: 'center', marginTop: DIMENSIONS.SPACING,
          lineHeight: TYPOGRAPHY.bodyXXS * 1.6, opacity: 0.6,
        }}>
          {t('pricing.legalNote' as any)}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
