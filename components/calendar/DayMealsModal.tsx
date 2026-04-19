import {
  View, Text, Modal, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Platform,
} from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { useStore } from '@/store/useStore';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { fetchDayMeals, MealRecord } from '@/services/api';

interface DayMealsModalProps {
  date: string | null; // YYYY-MM-DD, null = closed
  onClose: () => void;
}

export default function DayMealsModal({ date, onClose }: DayMealsModalProps) {
  const colors = useTheme();
  const { t } = useTranslation();
  const { language, dailyCalorieGoal } = useStore();
  const [loading, setLoading] = useState(false);
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    setMeals([]);
    setFetchError(false);
    fetchDayMeals(date)
      .then((data) => {
        setMeals(data.meals);
        setTotalCalories(data.totalCalories);
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [date]);

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-').map(Number);
    const localDate = new Date(y, m - 1, day, 12);
    return localDate.toLocaleDateString(language, { month: 'long', day: 'numeric', weekday: 'long' });
  };

  const progress = dailyCalorieGoal > 0 ? Math.min((totalCalories / dailyCalorieGoal) * 100, 100) : 0;

  return (
    <Modal
      visible={!!date}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{
          backgroundColor: colors.backgroundPrimary,
          borderTopLeftRadius: 32, borderTopRightRadius: 32,
          maxHeight: '85%',
          borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2,
          borderColor: colors.borderPrimary,
        }}>
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: DIMENSIONS.SPACING * 0.8 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderPrimary }} />
          </View>

          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: DIMENSIONS.CARD_PADDING,
            paddingTop: DIMENSIONS.SPACING * 0.8,
            paddingBottom: DIMENSIONS.SPACING * 0.4,
          }}>
            <View>
              <Text style={{ fontSize: TYPOGRAPHY.title, fontWeight: '900', color: colors.textPrimary }}>
                {date ? formatDate(date) : ''}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: colors.cardBackgroundSecondary,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: colors.borderPrimary,
              }}
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Calorie summary bar */}
          {!loading && (
            <View style={{
              marginHorizontal: DIMENSIONS.CARD_PADDING,
              marginBottom: DIMENSIONS.SPACING,
              padding: DIMENSIONS.SPACING * 0.9,
              backgroundColor: colors.cardBackground,
              borderRadius: 16, borderWidth: 2, borderColor: colors.borderPrimary,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: DIMENSIONS.SPACING * 0.5 }}>
                <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {t('today.todayCalories')}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ fontSize: TYPOGRAPHY.numberS, fontWeight: '900', color: colors.textPrimary }}>
                    {totalCalories}
                  </Text>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '600', color: colors.textSecondary }}>
                    / {dailyCalorieGoal} {t('today.kcal')}
                  </Text>
                </View>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.cardBackgroundSecondary, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${progress}%`, borderRadius: 3, backgroundColor: colors.textPrimary }} />
              </View>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: DIMENSIONS.CARD_PADDING,
              paddingBottom: Platform.OS === 'ios' ? 40 : 24,
            }}
          >
            {loading && (
              <View style={{ paddingVertical: DIMENSIONS.SPACING * 3, alignItems: 'center' }}>
                <ActivityIndicator color={colors.textPrimary} />
              </View>
            )}

            {!loading && fetchError && (
              <View style={{ paddingVertical: DIMENSIONS.SPACING * 2, alignItems: 'center', gap: DIMENSIONS.SPACING * 0.6 }}>
                <Ionicons name="cloud-offline-outline" size={TYPOGRAPHY.iconM} color={colors.textSecondary} />
                <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '600', color: colors.textSecondary }}>
                  {t('log.fetchFailed' as any)}
                </Text>
              </View>
            )}

            {!loading && !fetchError && meals.length === 0 && (
              <View style={{ paddingVertical: DIMENSIONS.SPACING * 2, alignItems: 'center' }}>
                <Ionicons name="restaurant-outline" size={TYPOGRAPHY.iconM} color={colors.textSecondary} />
                <Text style={{
                  fontSize: TYPOGRAPHY.bodyS, fontWeight: '600',
                  color: colors.textSecondary, marginTop: DIMENSIONS.SPACING * 0.6,
                }}>
                  {t('log.noMealsLogged' as any)}
                </Text>
              </View>
            )}

            {!loading && !fetchError && meals.map((meal, i) => (
              <View
                key={meal.id || i}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingVertical: DIMENSIONS.SPACING * 0.8,
                  borderBottomWidth: i < meals.length - 1 ? 1 : 0,
                  borderBottomColor: colors.borderPrimary,
                  gap: DIMENSIONS.SPACING * 0.8,
                }}
              >
                {/* Image or icon */}
                {meal.image_url ? (
                  <Image
                    source={{ uri: meal.image_url }}
                    style={{ width: 52, height: 52, borderRadius: 12 }}
                  />
                ) : (
                  <View style={{
                    width: 52, height: 52, borderRadius: 12,
                    backgroundColor: colors.cardBackgroundSecondary,
                    borderWidth: 1, borderColor: colors.borderPrimary,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ionicons name="restaurant-outline" size={TYPOGRAPHY.iconXS} color={colors.textSecondary} />
                  </View>
                )}

                {/* Name + macros */}
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: TYPOGRAPHY.bodyS, fontWeight: '800',
                    color: colors.textPrimary, marginBottom: 3,
                  }} numberOfLines={1}>
                    {meal.food_name}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.6 }}>
                    {meal.protein > 0 && (
                      <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textSecondary }}>
                        {t('log.protein')} {meal.protein}g
                      </Text>
                    )}
                    {meal.carbs > 0 && (
                      <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textSecondary }}>
                        {t('log.carbs')} {meal.carbs}g
                      </Text>
                    )}
                    {meal.fat > 0 && (
                      <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textSecondary }}>
                        {t('log.fat')} {meal.fat}g
                      </Text>
                    )}
                  </View>
                </View>

                {/* Calories */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>
                    {meal.calories}
                  </Text>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textSecondary }}>
                    {t('today.kcal')}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
