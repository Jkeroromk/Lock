import { View, Text, TouchableOpacity, Modal, TextInput, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { deleteMeal, updateMeal } from '@/services/api';
import { useStore } from '@/store/useStore';

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

// ── Edit Meal Modal ──────────────────────────────────────────────────────────

function EditMealModal({
  meal, visible, onClose, onSaved,
}: { meal: Meal; visible: boolean; onClose: () => void; onSaved: () => void }) {
  const colors = useTheme();
  const { t } = useTranslation();
  const [foodName, setFoodName] = useState(meal.food_name);
  const [calories, setCalories] = useState(String(meal.calories));
  const [protein, setProtein] = useState(String(meal.protein));
  const [carbs, setCarbs] = useState(String(meal.carbs));
  const [fat, setFat] = useState(String(meal.fat));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!meal.id) return;
    setSaving(true);
    try {
      await updateMeal(meal.id, {
        food_name: foodName.trim() || meal.food_name,
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      Alert.alert(t('weightTracker.saveFailed'), err.message || t('common.retry'));
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = {
    backgroundColor: colors.cardBackgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    paddingHorizontal: DIMENSIONS.SPACING * 0.8,
    paddingVertical: DIMENSIONS.SPACING * 0.6,
    fontSize: TYPOGRAPHY.bodyM as number,
    fontWeight: '700' as const,
    color: colors.textPrimary,
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{
            backgroundColor: colors.backgroundPrimary,
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
            borderColor: colors.borderPrimary,
            paddingHorizontal: DIMENSIONS.CARD_PADDING,
            paddingTop: DIMENSIONS.SPACING,
            paddingBottom: DIMENSIONS.SPACING * 1.5,
          }}>
            {/* Handle */}
            <View style={{ alignItems: 'center', marginBottom: DIMENSIONS.SPACING }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.borderPrimary }} />
            </View>

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING }}>
              <Text style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: colors.textPrimary }}>
                {t('log.edit')}
              </Text>
              <TouchableOpacity onPress={onClose} style={{
                width: 30, height: 30, borderRadius: 15,
                backgroundColor: colors.cardBackgroundSecondary,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="close" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Food name */}
            <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              {t('log.analyzeFood')}
            </Text>
            <TextInput
              value={foodName}
              onChangeText={setFoodName}
              style={{ ...fieldStyle, marginBottom: DIMENSIONS.SPACING }}
              placeholderTextColor={colors.textSecondary}
            />

            {/* Calories */}
            <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              {t('log.calories')}
            </Text>
            <TextInput
              value={calories}
              onChangeText={setCalories}
              keyboardType="numeric"
              style={{ ...fieldStyle, marginBottom: DIMENSIONS.SPACING }}
              placeholderTextColor={colors.textSecondary}
            />

            {/* Macros */}
            <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              {t('log.protein')} / {t('log.carbs')} / {t('log.fat')} (g)
            </Text>
            <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.5, marginBottom: DIMENSIONS.SPACING * 1.2 }}>
              {[
                { label: t('log.protein'), val: protein, set: setProtein },
                { label: t('log.carbs'),   val: carbs,   set: setCarbs   },
                { label: t('log.fat'),     val: fat,     set: setFat     },
              ].map((m) => (
                <View key={m.label} style={{ flex: 1 }}>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textSecondary, textAlign: 'center', marginBottom: 4 }}>
                    {m.label}
                  </Text>
                  <TextInput
                    value={m.val}
                    onChangeText={m.set}
                    keyboardType="numeric"
                    style={{ ...fieldStyle, textAlign: 'center' }}
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              ))}
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.5 }}>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  flex: 1, paddingVertical: DIMENSIONS.SPACING * 0.85,
                  borderRadius: 16, alignItems: 'center',
                  backgroundColor: colors.cardBackground,
                  borderWidth: 1, borderColor: colors.borderPrimary,
                }}
              >
                <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.textPrimary }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={{
                  flex: 2, paddingVertical: DIMENSIONS.SPACING * 0.85,
                  borderRadius: 16, alignItems: 'center',
                  backgroundColor: colors.textPrimary,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.backgroundPrimary }}>
                  {saving ? t('log.saving' as any) : t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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
    Alert.alert(
      t('weightTracker.deleteTitle'),
      `${meal.food_name}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'), style: 'destructive',
          onPress: async () => {
            setDeletingId(id);
            try {
              await deleteMeal(id);
              removeMealOptimistic(id);
              refreshToday();
            } catch (err: any) {
              Alert.alert(t('common.error'), err.message || t('common.retry'));
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ marginBottom: DIMENSIONS.SPACING }}>
      {/* Section header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: DIMENSIONS.SPACING * 0.8,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="restaurant" size={TYPOGRAPHY.iconXS} color={colors.textPrimary} />
          <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>
            {t('today.meals')}
          </Text>
        </View>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: colors.cardBackground,
          borderRadius: 10, borderWidth: 1, borderColor: colors.borderPrimary,
          paddingHorizontal: DIMENSIONS.SPACING * 0.6, paddingVertical: 4,
          gap: 4,
        }}>
          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '800', color: colors.textPrimary }}>
            {meals.length}
          </Text>
          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textSecondary }}>
            {t('today.recorded')}
          </Text>
        </View>
      </View>

      {meals.length === 0 ? (
        <View style={{
          borderRadius: 20, padding: DIMENSIONS.SPACING * 2,
          backgroundColor: colors.cardBackground,
          borderWidth: 1, borderColor: colors.borderPrimary,
          alignItems: 'center',
        }}>
          <View style={{
            width: 56, height: 56, borderRadius: 18,
            backgroundColor: colors.cardBackgroundSecondary,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: DIMENSIONS.SPACING * 0.8,
          }}>
            <Ionicons name="restaurant-outline" size={TYPOGRAPHY.iconM} color={colors.textSecondary} />
          </View>
          <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary, marginBottom: 4 }}>
            {t('today.noMeals')}
          </Text>
          <Text style={{
            fontSize: TYPOGRAPHY.bodyS, fontWeight: '500',
            color: colors.textSecondary, textAlign: 'center',
            lineHeight: TYPOGRAPHY.bodyS * 1.6,
          }}>
            {t('today.startRecording')}
          </Text>
        </View>
      ) : (
        <View style={{
          borderRadius: 20, overflow: 'hidden',
          backgroundColor: colors.cardBackground,
          borderWidth: 1, borderColor: colors.borderPrimary,
        }}>
          {meals.map((meal, index) => {
            const mealIcon = MEAL_ICONS[Math.min(index, MEAL_ICONS.length - 1)];
            const rowId = meal.id ?? String(index);
            const isActive = activeMealId === rowId;
            const isDeleting = deletingId === meal.id;

            return (
              <View
                key={rowId}
                style={{
                  borderBottomWidth: index < meals.length - 1 ? 1 : 0,
                  borderBottomColor: colors.borderPrimary,
                  opacity: isDeleting ? 0.4 : 1,
                }}
              >
                {/* Tappable meal row */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveMealId(isActive ? null : rowId)}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: DIMENSIONS.SPACING,
                    paddingVertical: DIMENSIONS.SPACING * 0.9,
                  }}
                >
                  {/* Icon */}
                  <View style={{
                    width: 36, height: 36, borderRadius: 11,
                    backgroundColor: colors.cardBackgroundSecondary,
                    alignItems: 'center', justifyContent: 'center',
                    marginRight: DIMENSIONS.SPACING * 0.7,
                  }}>
                    <Ionicons name={mealIcon as any} size={TYPOGRAPHY.bodyM} color={colors.textPrimary} />
                  </View>

                  {/* Name + macros */}
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: TYPOGRAPHY.bodyM, fontWeight: '700',
                      color: colors.textPrimary, marginBottom: 3,
                    }} numberOfLines={1}>
                      {meal.food_name}
                    </Text>
                    <Text style={{
                      fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600',
                      color: colors.textSecondary,
                    }}>
                      {t('log.protein')} {meal.protein}g · {t('log.carbs')} {meal.carbs}g · {t('log.fat')} {meal.fat}g
                    </Text>
                  </View>

                  {/* Calories + chevron */}
                  <View style={{ alignItems: 'flex-end', marginLeft: 8, gap: 2 }}>
                    <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>
                      {meal.calories}
                    </Text>
                    <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textSecondary }}>
                      {t('today.kcal')}
                    </Text>
                  </View>
                  <Ionicons
                    name={isActive ? 'chevron-up' : 'chevron-down'}
                    size={TYPOGRAPHY.bodyS}
                    color={colors.textSecondary}
                    style={{ marginLeft: 6 }}
                  />
                </TouchableOpacity>

                {/* Expanded action row */}
                {isActive && (
                  <View style={{
                    flexDirection: 'row',
                    borderTopWidth: 1, borderTopColor: colors.borderPrimary,
                    backgroundColor: colors.cardBackgroundSecondary,
                  }}>
                    <TouchableOpacity
                      onPress={() => { setEditingMeal(meal); setActiveMealId(null); }}
                      style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                        gap: 6, paddingVertical: DIMENSIONS.SPACING * 0.75,
                        borderRightWidth: 1, borderRightColor: colors.borderPrimary,
                      }}
                    >
                      <Ionicons name="create-outline" size={TYPOGRAPHY.bodyM} color={colors.textPrimary} />
                      <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textPrimary }}>
                        {t('log.edit')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(meal)}
                      disabled={isDeleting}
                      style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                        gap: 6, paddingVertical: DIMENSIONS.SPACING * 0.75,
                      }}
                    >
                      <Ionicons name="trash-outline" size={TYPOGRAPHY.bodyM} color="#EF4444" />
                      <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: '#EF4444' }}>
                        {isDeleting ? t('common.deleting' as any) : t('common.delete')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          {/* Footer total */}
          {meals.length > 1 && (
            <View style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              padding: DIMENSIONS.SPACING * 0.8,
              paddingHorizontal: DIMENSIONS.SPACING,
              backgroundColor: colors.cardBackgroundSecondary,
              borderTopWidth: 1, borderTopColor: colors.borderPrimary,
            }}>
              <Text style={{
                fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700',
                color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8,
              }}>
                {t('today.todayCalories')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>
                  {totalCalories.toLocaleString()}
                </Text>
                <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textSecondary }}>
                  {t('today.kcal')}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Edit Modal */}
      {editingMeal && (
        <EditMealModal
          meal={editingMeal}
          visible={true}
          onClose={() => setEditingMeal(null)}
          onSaved={() => refreshToday()}
        />
      )}
    </View>
  );
}
