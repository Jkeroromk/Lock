import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

interface MyRankCardProps {
  user: { name?: string } | null;
  todayCalories: number;
  rank: number;
}

export default function MyRankCard({ user, todayCalories, rank }: MyRankCardProps) {
  const { t } = useTranslation();
  const colors = useTheme();

  return (
    <View
      style={{
        borderRadius: 16,
        padding: DIMENSIONS.SPACING * 0.8,
        marginBottom: DIMENSIONS.SPACING * 0.8,
        backgroundColor: colors.cardBackground,
        borderWidth: 1,
        borderColor: colors.borderPrimary,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: DIMENSIONS.SCREEN_WIDTH * 0.09,
            height: DIMENSIONS.SCREEN_WIDTH * 0.09,
            borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.045,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: DIMENSIONS.SPACING * 0.6,
            backgroundColor: colors.cardBackgroundSecondary,
            borderWidth: 1,
            borderColor: colors.borderPrimary,
          }}
        >
          <Text
            style={{
              fontSize: TYPOGRAPHY.bodyL,
              fontWeight: '900',
              color: colors.textPrimary,
            }}
          >
            {user?.name?.charAt(0) || 'U'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: TYPOGRAPHY.bodyS,
              fontWeight: '900',
              color: colors.textPrimary,
              marginBottom: 2,
            }}
          >
            {t('dashboard.myRanking')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="trophy" size={TYPOGRAPHY.bodyXS} color={colors.textPrimary} style={{ marginRight: DIMENSIONS.SPACING * 0.3 }} />
            <Text
              style={{
                fontSize: TYPOGRAPHY.bodyXS,
                fontWeight: '700',
                color: colors.textPrimary,
              }}
            >
              {t('dashboard.rankFormat' as any).replace('{rank}', String(rank))}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={{
              fontSize: TYPOGRAPHY.numberS,
              fontWeight: '900',
              color: colors.textPrimary,
              marginBottom: 1,
            }}
          >
            {todayCalories}
          </Text>
          <Text
            style={{
              fontSize: TYPOGRAPHY.bodyXXS,
              fontWeight: '600',
              color: colors.textPrimary,
            }}
          >
            {t('today.kcal')}
          </Text>
        </View>
      </View>
    </View>
  );
}

