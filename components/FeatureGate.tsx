import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/Text';
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
      borderRadius: 22,
      padding: 20,
      backgroundColor: colors.cardBackground,
      borderWidth: 2,
      borderColor: colors.borderPrimary,
      alignItems: 'center',
      gap: DIMENSIONS.SPACING * 0.6,
    }}>
      <View style={{
        width: 52, height: 52, borderRadius: 16,
        backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.ink,
        alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }],
      }}>
        <Ionicons name="lock-closed" size={22} color={colors.onAccent} />
      </View>
      <Text style={{
        fontSize: 20, fontWeight: '800',
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
        <TouchableOpacity accessibilityRole="button" style={{
          marginTop: 6, minHeight: 48, paddingHorizontal: 22, justifyContent: 'center',
          backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.ink,
          borderRadius: 14,
        }}>
          <Text style={{
            fontSize: 16, fontWeight: '800',
            color: colors.onAccent,
          }}>
            {t('featureGate.viewPlans' as any)}
          </Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
