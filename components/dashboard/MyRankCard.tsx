import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';

interface MyRankCardProps {
  user: { name?: string } | null;
  todayCalories: number;
  rank: number;
}

export default function MyRankCard({ user, todayCalories, rank }: MyRankCardProps) {
  const { t } = useTranslation();

  return (
    <View 
      style={{ 
        borderRadius: 24,
        padding: DIMENSIONS.SPACING * 1.4,
        marginBottom: DIMENSIONS.SPACING * 1.2,
        backgroundColor: COLORS.cardBackground,
        borderWidth: 2,
        borderColor: COLORS.borderPrimary,
        shadowColor: COLORS.shadowColor,
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
            backgroundColor: COLORS.cardBackgroundSecondary,
            borderWidth: 2,
            borderColor: COLORS.borderPrimary,
          }}
        >
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.title,
              fontWeight: '900',
              color: COLORS.textPrimary,
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
              color: COLORS.textPrimary,
              marginBottom: DIMENSIONS.SPACING * 0.3,
            }}
          >
            {t('dashboard.myRanking')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="trophy" size={TYPOGRAPHY.iconXS} color={COLORS.textPrimary} style={{ marginRight: DIMENSIONS.SPACING * 0.4 }} />
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.bodyS,
                fontWeight: '700',
                color: COLORS.textPrimary,
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
              color: COLORS.textPrimary,
              marginBottom: DIMENSIONS.SPACING * 0.2,
            }}
          >
            {todayCalories}
          </Text>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.bodyXXS,
              fontWeight: '600',
              color: COLORS.textPrimary,
            }}
          >
            {t('today.kcal')}
          </Text>
        </View>
      </View>
    </View>
  );
}

