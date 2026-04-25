import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { deleteMeal } from '@/services/api';
import { useStore } from '@/store/useStore';
import EditMealModal from './EditMealModal';

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

const MEAL_ICONS = ['sunny', 'cafe', 'restaurant', 'moon'] as const;

export default function MealsList({ meals }: MealsListProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const { removeMealOptimistic, refreshToday } = useStore();
  const [activeMealId, setActiveMealId] = useState<string | null>(null);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalCalories = meals.reduce((s, m) => s + m.calories, 0);

  const handleDelete = (meal: Meal) => {
    if (!meal.id) return;
    const id = meal.id;
    setActiveMealId(null);
    Alert.alert(t('weightTracker.deleteTitle'), `${meal.food_name}?`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
        onPress: async () => {
          setDeletingId(id);
          try { await deleteMeal(id); removeMealOptimistic(id); refreshToday(); }
          catch (err: any) { Alert.alert(t('common.error'), err.message || t('common.retry')); }
          finally { setDeletingId(null); }
        },
      },
    ]);
  };

  return (
    <View style={{ marginBottom: DIMENSIONS.SPACING }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING * 0.8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="restaurant" size={TYPOGRAPHY.iconXS} color={colors.textPrimary} />
          <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>{t('today.meals')}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, borderRadius: 10, borderWidth: 1, borderColor: colors.borderPrimary, paddingHorizontal: DIMENSIONS.SPACING * 0.6, paddingVertical: 4, gap: 4 }}>
          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '800', color: colors.textPrimary }}>{meals.length}</Text>
          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textSecondary }}>{t('today.recorded')}</Text>
        </View>
      </View>

      {meals.length === 0 ? (
        <View style={{ borderRadius: 20, padding: DIMENSIONS.SPACING * 2, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.borderPrimary, alignItems: 'center' }}>
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.cardBackgroundSecondary, alignItems: 'center', justifyContent: 'center', marginBottom: DIMENSIONS.SPACING * 0.8 }}>
            <Ionicons name="restaurant-outline" size={TYPOGRAPHY.iconM} color={colors.textSecondary} />
          </View>
          <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary, marginBottom: 4 }}>{t('today.noMeals')}</Text>
          <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '500', color: colors.textSecondary, textAlign: 'center', lineHeight: TYPOGRAPHY.bodyS * 1.6 }}>{t('today.startRecording')}</Text>
        </View>
      ) : (
        <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.borderPrimary }}>
          {meals.map((meal, index) => {
            const mealIcon = MEAL_ICONS[Math.min(index, MEAL_ICONS.length - 1)];
            const rowId = meal.id ?? String(index);
            const isActive = activeMealId === rowId;
            const isDeleting = deletingId === meal.id;

            return (
              <View key={rowId} style={{ borderBottomWidth: index < meals.length - 1 ? 1 : 0, borderBottomColor: colors.borderPrimary, opacity: isDeleting ? 0.4 : 1 }}>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveMealId(isActive ? null : rowId)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: DIMENSIONS.SPACING, paddingVertical: DIMENSIONS.SPACING * 0.9 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: colors.cardBackgroundSecondary, alignItems: 'center', justifyContent: 'center', marginRight: DIMENSIONS.SPACING * 0.7 }}>
                    <Ionicons name={mealIcon as any} size={TYPOGRAPHY.bodyM} color={colors.textPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 }} numberOfLines={1}>{meal.food_name}</Text>
                    <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textSecondary }}>{t('log.protein')} {meal.protein}g · {t('log.carbs')} {meal.carbs}g · {t('log.fat')} {meal.fat}g</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginLeft: 8, gap: 2 }}>
                    <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>{meal.calories}</Text>
                    <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textSecondary }}>{t('today.kcal')}</Text>
                  </View>
                  <Ionicons name={isActive ? 'chevron-up' : 'chevron-down'} size={TYPOGRAPHY.bodyS} color={colors.textSecondary} style={{ marginLeft: 6 }} />
                </TouchableOpacity>

                {isActive && (
                  <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.borderPrimary, backgroundColor: colors.cardBackgroundSecondary }}>
                    <TouchableOpacity onPress={() => { setEditingMeal(meal); setActiveMealId(null); }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: DIMENSIONS.SPACING * 0.75, borderRightWidth: 1, borderRightColor: colors.borderPrimary }}>
                      <Ionicons name="create-outline" size={TYPOGRAPHY.bodyM} color={colors.textPrimary} />
                      <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textPrimary }}>{t('log.edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(meal)} disabled={isDeleting} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: DIMENSIONS.SPACING * 0.75 }}>
                      <Ionicons name="trash-outline" size={TYPOGRAPHY.bodyM} color="#EF4444" />
                      <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: '#EF4444' }}>{isDeleting ? t('common.deleting' as any) : t('common.delete')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          {meals.length > 1 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: DIMENSIONS.SPACING * 0.8, paddingHorizontal: DIMENSIONS.SPACING, backgroundColor: colors.cardBackgroundSecondary, borderTopWidth: 1, borderTopColor: colors.borderPrimary }}>
              <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 }}>{t('today.todayCalories')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>{totalCalories.toLocaleString()}</Text>
                <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textSecondary }}>{t('today.kcal')}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {editingMeal && (
        <EditMealModal meal={editingMeal} visible={true} onClose={() => setEditingMeal(null)} onSaved={() => refreshToday()} />
      )}
    </View>
  );
}
