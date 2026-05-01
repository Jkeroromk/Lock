import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Linking,
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
  fetchProOffering, fetchMaxOffering,
  purchasePackage, restorePurchases,
  planFromCustomerInfo,
  type PurchasesPackage,
} from '@/lib/revenuecat';
import { syncSubscriptionPlan } from '@/services/api';

export default function PricingScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { t } = useTranslation();
  const { user, setPlan } = useStore();

  const [proPackage, setProPackage] = useState<PurchasesPackage | null>(null);
  const [maxPackage, setMaxPackage] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<'pro' | 'max' | null>(null);
  const [restoring, setRestoring] = useState(false);

  const currentPlan = user?.plan ?? 'FREE';
  const isPro = currentPlan === 'PRO';
  const isMax = currentPlan === 'MAX';
  const isPaid = isPro || isMax;

  useEffect(() => { loadOfferings(); }, []);

  async function loadOfferings() {
    setLoading(true);
    try {
      const [proOff, maxOff] = await Promise.all([fetchProOffering(), fetchMaxOffering()]);
      setProPackage(proOff?.availablePackages?.[0] ?? null);
      setMaxPackage(maxOff?.availablePackages?.[0] ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase(tier: 'pro' | 'max') {
    const pkg = tier === 'pro' ? proPackage : maxPackage;
    if (!pkg) {
      Alert.alert(t('pricing.noPackages' as any), t('pricing.tryLater' as any));
      return;
    }
    setPurchasing(tier);
    try {
      const info = await purchasePackage(pkg);
      const newPlan = planFromCustomerInfo(info);
      if (newPlan !== 'FREE') {
        setPlan(newPlan);
        await syncSubscriptionPlan(newPlan);
        Alert.alert(
          t('pricing.purchaseSuccess' as any),
          t('pricing.purchaseSuccessMsg' as any),
          [{ text: t('common.confirm'), onPress: () => router.back() }],
        );
      }
    } catch (err: any) {
      if (err.userCancelled) return;
      Alert.alert(t('pricing.purchaseFailed' as any), err.message || t('common.retry'));
    } finally {
      setPurchasing(null);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      const info = await restorePurchases();
      const newPlan = planFromCustomerInfo(info);
      if (newPlan !== 'FREE') {
        setPlan(newPlan);
        await syncSubscriptionPlan(newPlan);
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

  function priceLabel(pkg: PurchasesPackage | null) {
    if (loading) return '—';
    if (!pkg) return t('pricing.loading' as any);
    const period = pkg.packageType === 'ANNUAL' ? t('pricing.annual' as any) : t('pricing.monthly' as any);
    return `${pkg.product.priceString} / ${period}`;
  }

  const freeFeatures: string[] = t('pricing.freeFeatures' as any) as any;
  const proFeatures: string[] = t('pricing.proFeatures' as any) as any;
  const maxFeatures: string[] = t('pricing.maxFeatures' as any) as any;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingVertical: DIMENSIONS.SPACING }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: DIMENSIONS.SPACING }}>
          <Ionicons name="chevron-back" size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: colors.textPrimary }}>
          {t('pricing.title' as any)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingBottom: DIMENSIONS.SPACING * 2 }} showsVerticalScrollIndicator={false}>

        {/* Current plan badge */}
        {isPaid && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isMax ? '#8B5CF622' : '#F59E0B22', borderRadius: 12, paddingVertical: DIMENSIONS.SPACING * 0.6, marginBottom: DIMENSIONS.SPACING * 1.2, gap: 6 }}>
            <Ionicons name="star" size={14} color={isMax ? '#8B5CF6' : '#F59E0B'} />
            <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: isMax ? '#8B5CF6' : '#F59E0B' }}>
              {isMax ? t('pricing.currentMax' as any) : t('pricing.currentPro' as any)}
            </Text>
          </View>
        )}

        {/* FREE card */}
        <PlanCard
          colors={colors}
          title={t('pricing.free' as any)}
          badge={!isPaid ? t('pricing.currentPlan' as any) : t('pricing.basic' as any)}
          badgeBg={colors.cardBackgroundSecondary}
          badgeColor={colors.textSecondary}
          price="$0"
          features={Array.isArray(freeFeatures) ? freeFeatures : []}
          checkColor={colors.textSecondary}
          borderColor={colors.borderPrimary}
          bg={colors.cardBackground}
          titleColor={colors.textPrimary}
          featureColor={colors.textSecondary}
          priceColor={colors.textPrimary}
        />

        {/* PRO card */}
        <PlanCard
          colors={colors}
          title="Pro"
          icon="star"
          iconColor="#F59E0B"
          badge={isPro ? t('pricing.currentPlan' as any) : undefined}
          badgeBg="#F59E0B33"
          badgeColor="#F59E0B"
          price={priceLabel(proPackage)}
          subPrice={t('pricing.cancelAnytime' as any)}
          features={Array.isArray(proFeatures) ? proFeatures : []}
          checkColor="#F59E0B"
          borderColor={colors.textPrimary}
          bg={colors.textPrimary}
          titleColor={colors.backgroundPrimary}
          featureColor={colors.backgroundPrimary}
          priceColor={colors.backgroundPrimary}
          subPriceColor={colors.backgroundPrimary}
        />
        {!isPro && !isMax && (
          <BuyButton label={t('pricing.upgradeToPro' as any)} color="#F59E0B" loading={purchasing === 'pro' || loading} onPress={() => handlePurchase('pro')} />
        )}

        {/* MAX card */}
        <PlanCard
          colors={colors}
          title="Max"
          icon="diamond"
          iconColor="#8B5CF6"
          badge={isMax ? t('pricing.currentPlan' as any) : t('pricing.bestValue' as any)}
          badgeBg="#8B5CF633"
          badgeColor="#8B5CF6"
          price={priceLabel(maxPackage)}
          subPrice={t('pricing.cancelAnytime' as any)}
          features={Array.isArray(maxFeatures) ? maxFeatures : []}
          checkColor="#8B5CF6"
          borderColor="#8B5CF6"
          bg="#8B5CF608"
          titleColor={colors.textPrimary}
          featureColor={colors.textPrimary}
          priceColor={colors.textPrimary}
          subPriceColor={colors.textSecondary}
        />
        {!isMax && (
          <BuyButton label={isPro ? t('pricing.upgradeToMax' as any) : t('pricing.upgradeToMax' as any)} color="#8B5CF6" loading={purchasing === 'max' || loading} onPress={() => handlePurchase('max')} />
        )}

        {/* Restore */}
        <TouchableOpacity onPress={handleRestore} disabled={restoring} style={{ alignItems: 'center', paddingVertical: DIMENSIONS.SPACING * 0.6, marginTop: DIMENSIONS.SPACING * 0.5 }}>
          {restoring
            ? <ActivityIndicator size="small" color={colors.textSecondary} />
            : <Text style={{ fontSize: TYPOGRAPHY.bodyXS, color: colors.textSecondary, fontWeight: '600' }}>{t('pricing.restorePurchase' as any)}</Text>
          }
        </TouchableOpacity>

        <LegalNote colors={colors} router={router} legalNote={t('pricing.legalNote' as any)} t={t} />
      </ScrollView>
    </SafeAreaView>
  );
}

function LegalNote({ colors, router, legalNote, t }: { colors: any; router: any; legalNote: string; t: (k: any) => any }) {
  const termsLabel: string = t('settings.termsOfService');
  const privacyLabel: string = t('settings.privacyPolicy');
  const parts = legalNote.split(/(Terms of Service|Privacy Policy|服务条款|隐私政策|服務條款|隱私政策|利用規約|プライバシーポリシー|이용약관|개인정보처리방침)/);
  return (
    <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary, textAlign: 'center', marginTop: DIMENSIONS.SPACING * 0.5, lineHeight: TYPOGRAPHY.bodyXXS * 1.6, opacity: 0.8 }}>
      {parts.map((part, i) => {
        const isTerms = part === 'Terms of Service' || part === '服务条款' || part === '服務條款' || part === '利用規約' || part === '이용약관';
        const isPrivacy = part === 'Privacy Policy' || part === '隐私政策' || part === '隱私政策' || part === 'プライバシーポリシー' || part === '개인정보처리방침';
        if (isTerms) {
          return (
            <Text key={i} style={{ color: colors.textPrimary, fontWeight: '600', textDecorationLine: 'underline' }}
              onPress={() => router.push('/(tabs)/settings/terms-of-service')}>
              {part}
            </Text>
          );
        }
        if (isPrivacy) {
          return (
            <Text key={i} style={{ color: colors.textPrimary, fontWeight: '600', textDecorationLine: 'underline' }}
              onPress={() => router.push('/(tabs)/settings/privacy-policy')}>
              {part}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

function PlanCard({ colors, title, icon, iconColor, badge, badgeBg, badgeColor, price, subPrice, features, checkColor, borderColor, bg, titleColor, featureColor, priceColor, subPriceColor }: any) {
  return (
    <View style={{ borderRadius: 20, padding: DIMENSIONS.SPACING * 1.2, backgroundColor: bg, borderWidth: 2, borderColor, marginBottom: DIMENSIONS.SPACING * 0.8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 0.8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {icon && <Ionicons name={icon} size={16} color={iconColor} />}
          <Text style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: titleColor }}>{title}</Text>
        </View>
        {badge && (
          <View style={{ paddingHorizontal: 10, paddingVertical: 3, backgroundColor: badgeBg, borderRadius: 8 }}>
            <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: badgeColor }}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={{ fontSize: TYPOGRAPHY.titleL, fontWeight: '900', color: priceColor, marginBottom: 2 }}>{price}</Text>
      {subPrice && <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: subPriceColor ?? featureColor, opacity: 0.6, marginBottom: DIMENSIONS.SPACING * 0.8 }}>{subPrice}</Text>}
      {features.map((f: string) => (
        <View key={f} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 }}>
          <Ionicons name="checkmark-circle" size={16} color={checkColor} />
          <Text style={{ fontSize: TYPOGRAPHY.bodyS, color: featureColor }}>{f}</Text>
        </View>
      ))}
    </View>
  );
}

function BuyButton({ label, color, loading, onPress }: { label: string; color: string; loading: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={loading} style={{ borderRadius: 16, paddingVertical: DIMENSIONS.SPACING, backgroundColor: color, alignItems: 'center', marginBottom: DIMENSIONS.SPACING, opacity: loading ? 0.7 : 1 }}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: '#fff' }}>{label}</Text>}
    </TouchableOpacity>
  );
}
