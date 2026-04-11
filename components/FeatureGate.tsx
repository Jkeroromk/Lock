import { View, Text, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/hooks/useTheme';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { hasFeature, Feature } from '@/lib/plans';
import type { PlanTier } from '@/store/useStore';
import { useTranslation } from '@/i18n';

interface FeatureGateProps {
  feature: Feature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { user } = useStore();
  const colors = useTheme();
  const { t } = useTranslation();
  const plan: PlanTier = user?.plan ?? 'FREE';

  if (hasFeature(plan, feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <View style={{
      borderRadius: 16,
      padding: DIMENSIONS.SPACING * 1.5,
      backgroundColor: colors.cardBackground,
      borderWidth: 1.5,
      borderColor: colors.borderPrimary,
      alignItems: 'center',
      gap: DIMENSIONS.SPACING * 0.6,
    }}>
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#F59E0B22',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Ionicons name="lock-closed" size={TYPOGRAPHY.iconS} color="#F59E0B" />
      </View>
      <Text style={{
        fontSize: TYPOGRAPHY.bodyM, fontWeight: '900',
        color: colors.textPrimary, textAlign: 'center',
      }}>
        {t('featureGate.upgradeTitle' as any)}
      </Text>
      <Text style={{
        fontSize: TYPOGRAPHY.bodyS, fontWeight: '500',
        color: colors.textSecondary, textAlign: 'center',
        lineHeight: TYPOGRAPHY.bodyS * 1.5,
      }}>
        {t('featureGate.upgradeDesc' as any)}
      </Text>
      <Link href="/(tabs)/settings/pricing" asChild>
        <TouchableOpacity style={{
          marginTop: DIMENSIONS.SPACING * 0.4,
          paddingHorizontal: DIMENSIONS.SPACING * 1.5,
          paddingVertical: DIMENSIONS.SPACING * 0.6,
          backgroundColor: colors.textPrimary,
          borderRadius: 12,
        }}>
          <Text style={{
            fontSize: TYPOGRAPHY.bodyS, fontWeight: '900',
            color: colors.backgroundPrimary,
          }}>
            {t('featureGate.viewPlans' as any)}
          </Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
