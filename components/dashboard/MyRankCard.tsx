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
        borderRadius: 24,
        padding: DIMENSIONS.SPACING * 1.4,
        marginBottom: DIMENSIONS.SPACING * 1.2,
        backgroundColor: colors.cardBackground,
        borderWidth: 2,
        borderColor: colors.borderPrimary,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 1.2 }}>
        <View 
          style={{ 
            width: DIMENSIONS.SCREEN_WIDTH * 0.12,
            height: DIMENSIONS.SCREEN_WIDTH * 0.12,
            borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.06,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: DIMENSIONS.SPACING * 0.8,
            backgroundColor: colors.cardBackgroundSecondary,
            borderWidth: 2,
            borderColor: colors.borderPrimary,
          }}
        >
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.title,
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
              fontSize: TYPOGRAPHY.bodyL,
              fontWeight: '900',
              color: colors.textPrimary,
              marginBottom: DIMENSIONS.SPACING * 0.3,
            }}
          >
            {t('dashboard.myRanking')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="trophy" size={TYPOGRAPHY.iconXS} color={colors.textPrimary} style={{ marginRight: DIMENSIONS.SPACING * 0.4 }} />
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.bodyS,
                fontWeight: '700',
                color: colors.textPrimary,
              }}
            >
              第 {rank} 名
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.numberM,
              fontWeight: '900',
              color: colors.textPrimary,
              marginBottom: DIMENSIONS.SPACING * 0.2,
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

