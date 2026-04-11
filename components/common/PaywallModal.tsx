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
  View, Text, Modal, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/hooks/useTheme';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { fetchOfferings, purchasePackage, restorePurchases, type PurchasesPackage } from '@/lib/revenuecat';
import { syncSubscriptionPlan } from '@/services/api';
import type { Feature } from '@/lib/plans';
import { useTranslation } from '@/i18n';

const PRO_HIGHLIGHT_ICONS = ['sparkles', 'bar-chart', 'people', 'download', 'headset'];

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

  const [proPackage, setProPackage] = useState<PurchasesPackage | null>(null);
  const [loadingOfferings, setLoadingOfferings] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (visible) loadOffering();
  }, [visible]);

  const loadOffering = async () => {
    setLoadingOfferings(true);
    try {
      const offering = await fetchOfferings();
      setProPackage(offering?.availablePackages?.[0] ?? null);
    } finally {
      setLoadingOfferings(false);
    }
  };

  const handlePurchase = async () => {
    if (!proPackage) {
      router.push('/(tabs)/settings/pricing');
      onClose();
      return;
    }
    setPurchasing(true);
    try {
      const info = await purchasePackage(proPackage);
      if (info.entitlements.active['pro']) {
        setPlan('PRO');
        await syncSubscriptionPlan('PRO');
        onClose();
      }
    } catch (err: any) {
      if (!err.userCancelled) {
        router.push('/(tabs)/settings/pricing');
        onClose();
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const info = await restorePurchases();
      if (info.entitlements.active['pro']) {
        setPlan('PRO');
        await syncSubscriptionPlan('PRO');
        onClose();
      }
    } catch {} finally {
      setRestoring(false);
    }
  };

  const priceLabel = proPackage
    ? `${proPackage.product.priceString} / ${proPackage.packageType === 'ANNUAL' ? t('paywall.annual' as any) : t('paywall.monthly' as any)}`
    : t('paywall.viewPlans' as any);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: colors.backgroundPrimary,
          borderTopLeftRadius: 32, borderTopRightRadius: 32,
          paddingHorizontal: DIMENSIONS.CARD_PADDING,
          paddingTop: DIMENSIONS.SPACING * 0.8,
          paddingBottom: DIMENSIONS.CARD_PADDING * 2,
          maxHeight: '85%',
        }}>
          {/* Handle + close */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING * 1.2 }}>
            <View style={{
              width: 40, height: 4, borderRadius: 2,
              backgroundColor: colors.borderPrimary, flex: 1,
            }} />
            <TouchableOpacity
              onPress={onClose}
              style={{ padding: DIMENSIONS.SPACING * 0.4, marginLeft: DIMENSIONS.SPACING }}
            >
              <Ionicons name="close" size={TYPOGRAPHY.iconXS} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Star icon */}
            <View style={{ alignItems: 'center', marginBottom: DIMENSIONS.SPACING }}>
              <View style={{
                width: 64, height: 64, borderRadius: 20,
                backgroundColor: '#F59E0B22',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: DIMENSIONS.SPACING * 0.8,
              }}>
                <Ionicons name="star" size={TYPOGRAPHY.iconM} color="#F59E0B" />
              </View>
              <Text style={{
                fontSize: TYPOGRAPHY.bodyL, fontWeight: '900',
                color: colors.textPrimary, textAlign: 'center',
                marginBottom: 6,
              }}>
                {displayTitle}
              </Text>
              <Text style={{
                fontSize: TYPOGRAPHY.bodyS, color: colors.textSecondary,
                textAlign: 'center', lineHeight: TYPOGRAPHY.bodyS * 1.5,
                paddingHorizontal: DIMENSIONS.SPACING,
              }}>
                {displayDesc}
              </Text>
            </View>

            {/* Features list */}
            <View style={{
              borderRadius: 16, backgroundColor: colors.cardBackground,
              borderWidth: 1, borderColor: colors.borderPrimary,
              padding: DIMENSIONS.SPACING * 1.2,
              marginBottom: DIMENSIONS.SPACING,
            }}>
              {PRO_HIGHLIGHT_ICONS.map((icon, i) => (
                <View key={i} style={{
                  flexDirection: 'row', alignItems: 'center',
                  gap: 12,
                  paddingVertical: DIMENSIONS.SPACING * 0.4,
                }}>
                  <View style={{
                    width: 28, height: 28, borderRadius: 8,
                    backgroundColor: '#F59E0B22',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ionicons name={icon as any} size={14} color="#F59E0B" />
                  </View>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.textPrimary }}>
                    {t(`paywall.feature${i + 1}` as any)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Purchase button */}
            <TouchableOpacity
              onPress={handlePurchase}
              disabled={purchasing || loadingOfferings}
              style={{
                borderRadius: 16, paddingVertical: DIMENSIONS.SPACING,
                backgroundColor: '#F59E0B',
                alignItems: 'center',
                marginBottom: DIMENSIONS.SPACING * 0.6,
                opacity: purchasing || loadingOfferings ? 0.7 : 1,
              }}
            >
              {purchasing || loadingOfferings ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: '#fff' }}>
                    {t('paywall.upgradePro' as any)}
                  </Text>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: '#fff', opacity: 0.8, marginTop: 2 }}>
                    {priceLabel}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Restore */}
            <TouchableOpacity
              onPress={handleRestore}
              disabled={restoring}
              style={{ alignItems: 'center', paddingVertical: DIMENSIONS.SPACING * 0.5 }}
            >
              {restoring
                ? <ActivityIndicator size="small" color={colors.textSecondary} />
                : <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary, fontWeight: '600' }}>
                    {t('paywall.restorePurchases' as any)}
                  </Text>
              }
            </TouchableOpacity>

            <Text style={{
              fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary,
              textAlign: 'center', marginTop: DIMENSIONS.SPACING * 0.8,
              opacity: 0.6, lineHeight: TYPOGRAPHY.bodyXXS * 1.6,
            }}>
              {t('paywall.subscriptionNote' as any)}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
