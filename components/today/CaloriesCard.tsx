import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

interface CaloriesCardProps {
  todayCalories: number;
  calorieProgress: number;
  remainingCalories: number;
}

export default function CaloriesCard({ todayCalories, calorieProgress, remainingCalories }: CaloriesCardProps) {
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
        overflow: 'hidden',
      }}
    >
      {/* Decorative background elements */}
      <View 
        style={{ 
          position: 'absolute',
          top: -DIMENSIONS.SCREEN_WIDTH * 0.15,
          right: -DIMENSIONS.SCREEN_WIDTH * 0.1,
          width: DIMENSIONS.SCREEN_WIDTH * 0.4,
          height: DIMENSIONS.SCREEN_WIDTH * 0.4,
          borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.2,
          backgroundColor: colors.cardBackgroundSecondary,
          opacity: 0.3,
        }}
      />
      <View 
        style={{ 
          position: 'absolute',
          bottom: -DIMENSIONS.SCREEN_WIDTH * 0.1,
          left: -DIMENSIONS.SCREEN_WIDTH * 0.08,
          width: DIMENSIONS.SCREEN_WIDTH * 0.3,
          height: DIMENSIONS.SCREEN_WIDTH * 0.3,
          borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.15,
          backgroundColor: colors.cardBackgroundSecondary,
          opacity: 0.2,
        }}
      />
      
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING * 1.2 }}>
        <View style={{ flex: 1 }}>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.bodyXXS,
              fontWeight: '700',
              color: colors.textPrimary,
              letterSpacing: 1.5,
              marginBottom: DIMENSIONS.SPACING * 0.6,
              textTransform: 'uppercase',
            }}
          >
            {t('today.todayCalories')}
          </Text>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.numberXL,
              fontWeight: '900',
              color: colors.textPrimary,
              letterSpacing: -4,
              marginBottom: DIMENSIONS.SPACING * 0.4,
              lineHeight: TYPOGRAPHY.numberXL * 1.1,
            }}
          >
            {todayCalories}
          </Text>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.bodyS,
              fontWeight: '600',
              color: colors.textPrimary,
            }}
          >
            {t('today.kcal')}
          </Text>
        </View>
        <View 
          style={{ 
            width: DIMENSIONS.SCREEN_WIDTH * 0.2,
            height: DIMENSIONS.SCREEN_WIDTH * 0.2,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.cardBackgroundSecondary,
            borderWidth: 2,
            borderColor: colors.borderSecondary,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Ionicons name="flame" size={TYPOGRAPHY.iconL} color={colors.textPrimary} />
        </View>
      </View>
      
      <View style={{ marginTop: DIMENSIONS.SPACING * 1.2, position: 'relative', zIndex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 0.8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="flag" size={TYPOGRAPHY.bodyS} color={colors.textPrimary} style={{ marginRight: DIMENSIONS.SPACING * 0.3, opacity: 0.8 }} />
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.bodyXS,
                fontWeight: '600',
                color: colors.textPrimary,
              }}
            >
              {t('today.target')}：2000 {t('today.kcal')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="arrow-down-circle" size={TYPOGRAPHY.bodyS} color={colors.textPrimary} style={{ marginRight: DIMENSIONS.SPACING * 0.3, opacity: 0.8 }} />
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.bodyXS,
                fontWeight: '700',
                color: colors.textPrimary,
              }}
            >
              {t('today.remaining')} {remainingCalories}
            </Text>
          </View>
        </View>
        <View 
          style={{ 
            height: 10,
            borderRadius: 5,
            overflow: 'hidden',
            backgroundColor: colors.cardBackgroundSecondary,
            borderWidth: 1,
            borderColor: colors.borderSecondary,
          }}
        >
          <View 
            style={{ 
              height: '100%',
              borderRadius: 5,
              width: `${calorieProgress}%`,
              backgroundColor: colors.progressWhite,
              shadowColor: colors.progressWhite,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 4,
              elevation: 2,
            }}
          />
        </View>
      </View>
    </View>
  );
}

