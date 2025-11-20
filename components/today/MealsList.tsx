import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';

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
              backgroundColor: COLORS.cardBackground,
              borderWidth: 1,
              borderColor: COLORS.borderPrimary,
            }}
          >
            <Ionicons name="restaurant" size={TYPOGRAPHY.iconXS} color={COLORS.textPrimary} />
          </View>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.titleM,
              fontWeight: '900',
              color: COLORS.textPrimary,
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
            backgroundColor: COLORS.cardBackground,
            borderWidth: 2,
            borderColor: COLORS.borderPrimary,
          }}
        >
          <Ionicons name="checkmark-circle" size={TYPOGRAPHY.bodyS} color={COLORS.textPrimary} style={{ marginRight: DIMENSIONS.SPACING * 0.3 }} />
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.bodyXXS,
              fontWeight: '700',
              color: COLORS.textPrimary,
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
            backgroundColor: COLORS.cardBackground,
            borderWidth: 1,
            borderColor: COLORS.borderPrimary,
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
              backgroundColor: COLORS.cardBackgroundSecondary,
            }}
          >
            <Ionicons name="restaurant-outline" size={TYPOGRAPHY.iconL} color={COLORS.textPrimary} />
          </View>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.body,
              fontWeight: '700',
              marginBottom: DIMENSIONS.SPACING * 0.4,
              color: COLORS.textPrimary,
            }}
          >
            {t('today.noMeals')}
          </Text>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.bodyS,
              textAlign: 'center',
              color: COLORS.textPrimary,
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
              backgroundColor: COLORS.cardBackground,
              borderWidth: 2,
              borderColor: COLORS.borderPrimary,
              shadowColor: COLORS.shadowColor,
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
                backgroundColor: COLORS.cardBackgroundSecondary,
                borderWidth: 1,
                borderColor: COLORS.borderSecondary,
              }}
            >
              <Ionicons name="fast-food" size={TYPOGRAPHY.iconS} color={COLORS.textPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyM,
                  fontWeight: '700',
                  marginBottom: DIMENSIONS.SPACING * 0.3,
                  color: COLORS.textPrimary,
                }}
              >
                {meal.food_name}
              </Text>
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyXS,
                  fontWeight: '500',
                  color: COLORS.textPrimary,
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
                  color: COLORS.textPrimary,
                }}
              >
                {meal.calories}
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
        ))
      )}
    </View>
  );
}

