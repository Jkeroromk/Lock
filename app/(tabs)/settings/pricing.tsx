import {
  View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, type ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { Button, Card, Label, ScreenHeader, Sticker } from '@/components/ui/bxc';
import { restorePurchases, planFromCustomerInfo } from '@/lib/revenuecat';
import { useProPlans, ProPlanPicker } from '@/components/pricing/ProPlanPicker';
import { syncSubscriptionPlan } from '@/services/api';
import { useTabBarInset } from '@/hooks/useTabBarInset';

export default function PricingScreen() {
  const tabInset = useTabBarInset();
  const router = useRouter();
  const colors = useTheme();
  const { t } = useTranslation();
  const { user, setPlan } = useStore();

  const plans = useProPlans();
  const [restoring, setRestoring] = useState(false);

  const currentPlan = user?.plan ?? 'FREE';
  // Max is retired; anyone still on it is shown as a Pro member.
  const isPaid = currentPlan === 'PRO' || currentPlan === 'MAX';

  const onPurchased = () => Alert.alert(
    t('pricing.purchaseSuccess' as any),
    t('pricing.purchaseSuccessMsg' as any),
    [{ text: t('common.confirm'), onPress: () => router.back() }],
  );

  async function handleRestore() {
    setRestoring(true);
    try {
      const info = await restorePurchases();
      const newPlan = planFromCustomerInfo(info);
      if (newPlan !== 'FREE') {
        setPlan(newPlan);
        await syncSubscriptionPlan();
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

  const freeFeatures: string[] = t('pricing.freeFeatures' as any) as any;
  const proFeatures: string[] = t('pricing.proFeatures' as any) as any;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
      <View style={{ paddingHorizontal: 12, paddingTop: 4 }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: tabInset }} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title={t('pricing.title' as any)}
          style={{ marginTop: 0 }}
          right={isPaid ? <Sticker>{t('pricing.currentPro' as any)}</Sticker> : undefined}
        />

        {plans.unavailable && !plans.loading ? (
          <Card padding={16} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="cloud-offline-outline" size={20} color={colors.textSecondary} />
              <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: colors.textSecondary }}>{t('pricing.offeringsError' as any)}</Text>
            </View>
            <Button label={t('common.retry')} variant="outline" onPress={plans.reload} style={{ marginTop: 12 }} />
            {plans.errorDetail ? (
              <Text selectable style={{ fontFamily: FONTS.mono, fontSize: 11, lineHeight: 15, color: colors.textSecondary, marginTop: 10 }}>{plans.errorDetail}</Text>
            ) : null}
          </Card>
        ) : null}

        {/* PRO */}
        <PlanCard
          variant="hero"
          title="Pro"
          icon="star"
          badge={isPaid ? t('pricing.currentPlan' as any) : undefined}
          features={Array.isArray(proFeatures) ? proFeatures : []}
        >
          {!isPaid ? <ProPlanPicker plans={plans} onPurchased={onPurchased} /> : null}
        </PlanCard>

        {/* FREE */}
        <PlanCard
          variant="default"
          title={t('pricing.free' as any)}
          badge={!isPaid ? t('pricing.currentPlan' as any) : t('pricing.basic' as any)}
          price="$0"
          features={Array.isArray(freeFeatures) ? freeFeatures : []}
        />

        <TouchableOpacity onPress={handleRestore} disabled={restoring} accessibilityRole="button" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 4 }}>
          {restoring
            ? <ActivityIndicator size="small" color={colors.textSecondary} />
            : <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{t('pricing.restorePurchase' as any)}</Text>}
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
    <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 18 }}>
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

function PlanCard({ variant, title, icon, badge, price, subPrice, features, children }: {
  variant: 'default' | 'hero' | 'inverse';
  title: string;
  icon?: string;
  badge?: string;
  price?: string;
  subPrice?: string;
  features: string[];
  children?: ReactNode;
}) {
  const c = useTheme();
  const inverse = variant === 'inverse';
  const fg = inverse ? c.textInverse : c.textPrimary;
  const muted = inverse ? c.textInverse : c.textSecondary;
  return (
    <Card variant={variant} padding={18} style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? (
            <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: c.accent, borderWidth: 2, borderColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={icon as any} size={14} color={c.onAccent} />
            </View>
          ) : null}
          <Text style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.6, color: fg }}>{title}</Text>
        </View>
        {badge ? (
          variant === 'default'
            ? <Label>{badge}</Label>
            : <Sticker rotate={3}>{badge}</Sticker>
        ) : null}
      </View>
      {price ? <Text style={{ fontSize: 34, fontWeight: '800', letterSpacing: -1.4, color: fg, marginTop: 10 }}>{price}</Text> : null}
      {subPrice ? (
        <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: muted, opacity: inverse ? 0.75 : 1, marginTop: 2, textTransform: 'uppercase' }}>{subPrice}</Text>
      ) : null}
      <View style={{ marginTop: 14, gap: 8 }}>
        {features.map((f) => (
          <View key={f} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <Ionicons name="checkmark" size={17} color={variant === 'default' ? c.textSecondary : inverse ? (c.surfaceInverse === c.ink ? c.accent : c.ink) : c.textPrimary} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 15, lineHeight: 20, color: fg }}>{f}</Text>
          </View>
        ))}
      </View>
      {children ? <View style={{ marginTop: 16 }}>{children}</View> : null}
    </Card>
  );
}
