import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

interface Meal {
  id?: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealsListProps {
  meals: Meal[];
}

export default function MealsList({ meals }: MealsListProps) {
  const { t } = useTranslation();
  const colors = useTheme();

  return (
    <View style={{ marginBottom: DIMENSIONS.SPACING }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING * 1.2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View 
            style={{ 
              width: DIMENSIONS.SCREEN_WIDTH * 0.1,
              height: DIMENSIONS.SCREEN_WIDTH * 0.1,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: DIMENSIONS.SPACING * 0.6,
              backgroundColor: colors.cardBackground,
              borderWidth: 1,
              borderColor: colors.borderPrimary,
            }}
          >
            <Ionicons name="restaurant" size={TYPOGRAPHY.iconXS} color={colors.textPrimary} />
          </View>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.titleM,
              fontWeight: '900',
              color: colors.textPrimary,
            }}
          >
            {t('today.meals')}
          </Text>
        </View>
        <View 
          style={{ 
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: DIMENSIONS.SPACING * 0.8,
            paddingVertical: DIMENSIONS.SPACING * 0.4,
            borderRadius: 20,
            backgroundColor: colors.cardBackground,
            borderWidth: 2,
            borderColor: colors.borderPrimary,
          }}
        >
          <Ionicons name="checkmark-circle" size={TYPOGRAPHY.bodyS} color={colors.textPrimary} style={{ marginRight: DIMENSIONS.SPACING * 0.3 }} />
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.bodyXXS,
              fontWeight: '700',
              color: colors.textPrimary,
            }}
          >
            {t('today.recorded')} {meals.length}
          </Text>
        </View>
      </View>

      {meals.length === 0 ? (
        <View 
          style={{ 
            borderRadius: 16,
            padding: DIMENSIONS.SPACING * 2.4,
            alignItems: 'center',
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.borderPrimary,
          }}
        >
          <View 
            style={{ 
              width: DIMENSIONS.SCREEN_WIDTH * 0.2,
              height: DIMENSIONS.SCREEN_WIDTH * 0.2,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: DIMENSIONS.SPACING * 0.8,
              backgroundColor: colors.cardBackgroundSecondary,
            }}
          >
            <Ionicons name="restaurant-outline" size={TYPOGRAPHY.iconL} color={colors.textPrimary} />
          </View>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.body,
              fontWeight: '700',
              marginBottom: DIMENSIONS.SPACING * 0.4,
              color: colors.textPrimary,
            }}
          >
            {t('today.noMeals')}
          </Text>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.bodyS,
              textAlign: 'center',
              color: colors.textPrimary,
              lineHeight: TYPOGRAPHY.bodyS * 1.5,
            }}
          >
            {t('today.startRecording')}
          </Text>
        </View>
      ) : (
        meals.map((meal, index) => (
          <View
            key={index}
            style={{ 
              borderRadius: 18,
              padding: DIMENSIONS.SPACING * 1.0,
              marginBottom: DIMENSIONS.SPACING * 0.6,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.cardBackground,
              borderWidth: 2,
              borderColor: colors.borderPrimary,
              shadowColor: colors.shadowColor,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 3,
            }}
          >
            <View 
              style={{ 
                width: DIMENSIONS.SCREEN_WIDTH * 0.12,
                height: DIMENSIONS.SCREEN_WIDTH * 0.12,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: DIMENSIONS.SPACING * 0.8,
                backgroundColor: colors.cardBackgroundSecondary,
                borderWidth: 1,
                borderColor: colors.borderSecondary,
              }}
            >
              <Ionicons name="fast-food" size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyM,
                  fontWeight: '700',
                  marginBottom: DIMENSIONS.SPACING * 0.3,
                  color: colors.textPrimary,
                }}
              >
                {meal.food_name}
              </Text>
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyXS,
                  fontWeight: '500',
                  color: colors.textPrimary,
                  lineHeight: TYPOGRAPHY.bodyXS * 1.4,
                }}
              >
                {meal.protein}g {t('log.protein')} · {meal.carbs}g {t('log.carbs')} · {meal.fat}g {t('log.fat')}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.body,
                  fontWeight: '900',
                  color: colors.textPrimary,
                }}
              >
                {meal.calories}
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
        ))
      )}
    </View>
  );
}

