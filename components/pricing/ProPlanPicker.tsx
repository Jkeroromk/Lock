import { useCallback, useEffect, useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button, Sticker } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { useStore } from '@/store/useStore';
import { syncSubscriptionPlan } from '@/services/api';
import {
  fetchProPackages, freeTrialDays, annualSavingsPercent,
  purchasePackage, planFromCustomerInfo, type PurchasesPackage,
} from '@/lib/revenuecat';

type Choice = 'annual' | 'monthly';

/** Lock Pro's yearly + monthly plans, the user's trial eligibility and the selected plan. */
export function useProPlans() {
  const [annual, setAnnual] = useState<PurchasesPackage | null>(null);
  const [monthly, setMonthly] = useState<PurchasesPackage | null>(null);
  const [trialDays, setTrialDays] = useState(0);
  const [selected, setSelected] = useState<Choice>('annual');
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setUnavailable(false);
    try {
      const pkgs = await fetchProPackages();
      setAnnual(pkgs.annual);
      setMonthly(pkgs.monthly);
      setSelected(pkgs.annual ? 'annual' : 'monthly');
      setTrialDays(await freeTrialDays(pkgs.annual));
      if (!pkgs.annual && !pkgs.monthly) setUnavailable(true);
    } catch (err) {
      console.warn('[pricing] offerings failed', err);
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const pkg = selected === 'annual' ? annual : monthly;
  return {
    annual, monthly, pkg, selected, setSelected, reload, loading, unavailable,
    // Only the yearly plan carries the free trial.
    trialDays: selected === 'annual' ? trialDays : 0,
    annualTrialDays: trialDays,
    savings: annualSavingsPercent(annual, monthly),
  };
}

type Plans = ReturnType<typeof useProPlans>;

/**
 * Yearly / monthly choice, the buy button and the price disclosure Apple asks for
 * (price, period and trial terms right next to the button).
 */
export function ProPlanPicker({ plans, onPurchased }: { plans: Plans; onPurchased?: () => void }) {
  const c = useTheme();
  const { t } = useTranslation();
  const { setPlan } = useStore();
  const [purchasing, setPurchasing] = useState(false);
  const { annual, monthly, pkg, selected, setSelected, loading, trialDays, annualTrialDays, savings } = plans;

  const buy = async () => {
    if (!pkg) { plans.reload(); return; }
    setPurchasing(true);
    try {
      const info = await purchasePackage(pkg);
      const plan = planFromCustomerInfo(info);
      if (plan !== 'FREE') {
        setPlan(plan);
        await syncSubscriptionPlan();
        onPurchased?.();
      }
    } catch (err: any) {
      if (!err?.userCancelled) Alert.alert(t('pricing.purchaseFailed' as any), err?.message || t('common.retry'));
    } finally {
      setPurchasing(false);
    }
  };

  const fill = (key: string, vars: Record<string, string | number>) =>
    Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), t(key as any) as string);

  const disclosure = !pkg
    ? ''
    : trialDays > 0
      ? fill('pricing.trialThen', { days: trialDays, price: pkg.product.priceString })
      : fill('pricing.billedThen', {
        price: pkg.product.priceString,
        period: t((selected === 'annual' ? 'pricing.annual' : 'pricing.monthly') as any),
      });

  return (
    <View>
      <View style={{ gap: 10 }}>
        {annual ? (
          <PlanOption
            selected={selected === 'annual'}
            onPress={() => setSelected('annual')}
            title={t('pricing.yearly' as any)}
            price={`${annual.product.priceString} / ${t('pricing.annual' as any)}`}
            sub={annual.product.pricePerMonthString ? fill('pricing.perMonth', { price: annual.product.pricePerMonthString }) : undefined}
            badges={[
              savings ? fill('pricing.save', { pct: savings }) : null,
              annualTrialDays > 0 ? fill('pricing.freeTrialBadge', { days: annualTrialDays }) : null,
            ]}
          />
        ) : null}
        {monthly ? (
          <PlanOption
            selected={selected === 'monthly'}
            onPress={() => setSelected('monthly')}
            title={t('pricing.monthlyPlan' as any)}
            price={`${monthly.product.priceString} / ${t('pricing.monthly' as any)}`}
          />
        ) : null}
      </View>

      <Button
        label={trialDays > 0 ? fill('pricing.startTrial', { days: trialDays }) : t('pricing.subscribe' as any)}
        icon="star"
        loading={purchasing || loading}
        disabled={loading}
        onPress={buy}
        style={{ marginTop: 14 }}
      />
      {disclosure ? (
        <Text style={{ fontSize: 12, lineHeight: 17, color: c.textSecondary, textAlign: 'center', marginTop: 8 }}>{disclosure}</Text>
      ) : null}
    </View>
  );
}

function PlanOption({ selected, onPress, title, price, sub, badges = [] }: {
  selected: boolean;
  onPress: () => void;
  title: string;
  price: string;
  sub?: string;
  badges?: (string | null)[];
}) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={[title, price, sub, ...badges.filter(Boolean)].filter(Boolean).join(', ')}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 64,
        borderRadius: 16, borderWidth: selected ? 2.5 : 1.5,
        borderColor: selected ? c.ink : c.borderPrimary,
        backgroundColor: selected ? c.accent : c.cardBackground,
      }}
    >
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={selected ? c.onAccent : c.textSecondary}
      />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: selected ? c.onAccent : c.textPrimary }}>{title}</Text>
          {badges.filter(Boolean).map((b) => (
            <Sticker key={b!} rotate={0} background={selected ? c.ink : c.accent} color={selected ? c.accent : c.onAccent} style={{ paddingHorizontal: 7, paddingVertical: 3 }}>{b}</Sticker>
          ))}
        </View>
        <Text style={{ fontSize: 14, marginTop: 2, color: selected ? c.onAccent : c.textSecondary }}>{price}</Text>
      </View>
      {sub ? (
        <Text style={{ fontFamily: FONTS.mono, fontSize: 12, fontWeight: '600', color: selected ? c.onAccent : c.textPrimary }}>{sub}</Text>
      ) : null}
    </Pressable>
  );
}
