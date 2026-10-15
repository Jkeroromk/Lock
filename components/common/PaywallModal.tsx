/**
 * PaywallModal — 当用户触发付费功能时弹出的升级提示
 *
 * 用法：
 *   <PaywallModal
 *     visible={showPaywall}
 *     onClose={() => setShowPaywall(false)}
 *     feature="aiDietAnalysis"
 *     title="AI 饮食分析"
 *     description="解锁专属 AI，每周为你生成个性化饮食报告和优化建议"
 *   />
 */
import {
  View, Modal, TouchableOpacity, ActivityIndicator, ScrollView,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/bxc';
import { restorePurchases, planFromCustomerInfo } from '@/lib/revenuecat';
import { useProPlans, ProPlanPicker } from '@/components/pricing/ProPlanPicker';
import { syncSubscriptionPlan } from '@/services/api';
import type { Feature } from '@/lib/plans';
import { useTranslation } from '@/i18n';

const PRO_HIGHLIGHT_ICONS = ['sparkles', 'bar-chart', 'people', 'download', 'trending-down'];

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: Feature;
  title?: string;
  description?: string;
}

export default function PaywallModal({
  visible,
  onClose,
  title,
  description,
}: PaywallModalProps) {
  const router = useRouter();
  const colors = useTheme();
  const { setPlan } = useStore();
  const { t } = useTranslation();
  const defaultTitle = t('paywall.upgradeTitle' as any);
  const defaultDesc = t('paywall.upgradeDesc' as any);
  const displayTitle = title ?? defaultTitle;
  const displayDesc = description ?? defaultDesc;

  const plans = useProPlans();
  const [restoring, setRestoring] = useState(false);

  // Refresh prices and trial eligibility each time the sheet opens.
  useEffect(() => { if (visible) plans.reload(); }, [visible]);

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const info = await restorePurchases();
      const newPlan = planFromCustomerInfo(info);
      if (newPlan !== 'FREE') {
        setPlan(newPlan);
        await syncSubscriptionPlan();
        onClose();
      }
    } catch {} finally {
      setRestoring(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: colors.backgroundPrimary,
          borderTopLeftRadius: 30, borderTopRightRadius: 30,
          borderWidth: 2, borderBottomWidth: 0, borderColor: colors.borderStrong,
          paddingHorizontal: 18, paddingTop: 10, paddingBottom: 34,
          maxHeight: '88%',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{
              width: 72, height: 72, borderRadius: 22, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.ink,
              alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }],
            }}>
              <Ionicons name="star" size={32} color={colors.onAccent} />
            </View>
            <Text style={{ fontSize: 34, fontWeight: '800', letterSpacing: -1.2, lineHeight: 36, color: colors.textPrimary, marginTop: 18 }}>
              {displayTitle}
            </Text>
            <Text style={{ fontSize: 15, lineHeight: 21, color: colors.textSecondary, marginTop: 8 }}>
              {displayDesc}
            </Text>

            <Card padding={14} style={{ marginTop: 18, marginBottom: 16 }}>
              {PRO_HIGHLIGHT_ICONS.map((icon, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 9, borderWidth: 2, borderColor: colors.borderPrimary, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={icon as any} size={15} color={colors.textPrimary} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>
                    {t(`paywall.feature${i + 1}` as any)}
                  </Text>
                </View>
              ))}
            </Card>

            <ProPlanPicker plans={plans} onPurchased={onClose} />
            <TouchableOpacity
              onPress={() => { onClose(); router.push('/(tabs)/settings/pricing'); }}
              accessibilityRole="button"
              style={{ alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 4 }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary }}>{t('paywall.viewPlans' as any)}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleRestore} disabled={restoring} accessibilityRole="button" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 4 }}>
              {restoring
                ? <ActivityIndicator size="small" color={colors.textSecondary} />
                : <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{t('paywall.restorePurchases' as any)}</Text>}
            </TouchableOpacity>

            <Text style={{ fontSize: 12, lineHeight: 18, color: colors.textSecondary, textAlign: 'center', marginTop: 6 }}>
              {t('paywall.subscriptionNote' as any)}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
