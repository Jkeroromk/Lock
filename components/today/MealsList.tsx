import { View, Text, TouchableOpacity, Modal, TextInput, Alert, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
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

const MACRO_COLORS = {
  protein: '#6366F1',
  carbs: '#F59E0B',
  fat: '#F97316',
};

const MEAL_ICONS = ['sunny', 'cafe', 'restaurant', 'moon'] as const;

// ── Edit Meal Modal ──────────────────────────────────────────────────────────

interface EditMealModalProps {
  meal: Meal;
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function EditMealModal({ meal, visible, onClose, onSaved }: EditMealModalProps) {
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
      Alert.alert('', err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    flex: 1,
    backgroundColor: colors.cardBackgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    paddingHorizontal: DIMENSIONS.SPACING * 0.7,
    paddingVertical: DIMENSIONS.SPACING * 0.55,
    fontSize: TYPOGRAPHY.bodyM,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    textAlign: 'center' as const,
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

            {/* Title row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING }}>
              <Text style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: colors.textPrimary }}>
                编辑餐食
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
              食物名称
            </Text>
            <TextInput
              value={foodName}
              onChangeText={setFoodName}
              style={{
                backgroundColor: colors.cardBackgroundSecondary,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.borderPrimary,
                paddingHorizontal: DIMENSIONS.SPACING * 0.8,
                paddingVertical: DIMENSIONS.SPACING * 0.6,
                fontSize: TYPOGRAPHY.bodyM,
                fontWeight: '700',
                color: colors.textPrimary,
                marginBottom: DIMENSIONS.SPACING,
              }}
              placeholderTextColor={colors.textSecondary}
            />

            {/* Calories */}
            <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              卡路里 (kcal)
            </Text>
            <TextInput
              value={calories}
              onChangeText={setCalories}
              keyboardType="numeric"
              style={{
                backgroundColor: colors.cardBackgroundSecondary,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.borderPrimary,
                paddingHorizontal: DIMENSIONS.SPACING * 0.8,
                paddingVertical: DIMENSIONS.SPACING * 0.6,
                fontSize: TYPOGRAPHY.bodyM,
                fontWeight: '700',
                color: colors.textPrimary,
                marginBottom: DIMENSIONS.SPACING,
              }}
              placeholderTextColor={colors.textSecondary}
            />

            {/* Macros row */}
            <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              宏量营养素 (g)
            </Text>
            <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.5, marginBottom: DIMENSIONS.SPACING * 1.2 }}>
              {([
                { label: t('log.protein'), val: protein, setter: setProtein, color: MACRO_COLORS.protein },
                { label: t('log.carbs'), val: carbs, setter: setCarbs, color: MACRO_COLORS.carbs },
                { label: t('log.fat'), val: fat, setter: setFat, color: MACRO_COLORS.fat },
              ] as const).map((m) => (
                <View key={m.label} style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: m.color, marginBottom: 4 }} />
                  <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: m.color, marginBottom: 4 }}>
                    {m.label}
                  </Text>
                  <TextInput
                    value={m.val}
                    onChangeText={m.setter}
                    keyboardType="numeric"
                    style={inputStyle}
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
                <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.textPrimary }}>取消</Text>
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
                  {saving ? '保存中...' : '保存'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main MealsList ────────────────────────────────────────────────────────────

export default function MealsList({ meals }: MealsListProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const { refreshToday } = useStore();
  const [activeMealId, setActiveMealId] = useState<string | null>(null);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  const totalCalories = meals.reduce((s, m) => s + m.calories, 0);

  const handleDelete = (meal: Meal) => {
    if (!meal.id) return;
    Alert.alert(
      '删除餐食',
      `确定要删除「${meal.food_name}」吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除', style: 'destructive',
          onPress: async () => {
            try {
              await deleteMeal(meal.id!);
              await refreshToday();
            } catch (err: any) {
              Alert.alert('', err.message || '删除失败');
            }
          },
        },
      ],
    );
    setActiveMealId(null);
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
            const totalMacros = meal.protein + meal.carbs + meal.fat || 1;
            const proteinPct = (meal.protein / totalMacros) * 100;
            const carbsPct = (meal.carbs / totalMacros) * 100;
            const fatPct = (meal.fat / totalMacros) * 100;
            const isActive = activeMealId === (meal.id ?? String(index));
            const accentColors = [MACRO_COLORS.protein, MACRO_COLORS.carbs, MACRO_COLORS.fat, '#10B981'];

            return (
              <View key={meal.id ?? index} style={{ flexDirection: 'row' }}>
                {/* Left accent bar */}
                <View style={{
                  width: 4,
                  backgroundColor: accentColors[index % 4],
                }} />

                <View style={{
                  flex: 1,
                  borderBottomWidth: index < meals.length - 1 ? 1 : 0,
                  borderBottomColor: colors.borderPrimary,
                }}>
                  {/* Main meal row */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setActiveMealId(isActive ? null : (meal.id ?? String(index)))}
                    style={{
                      paddingHorizontal: DIMENSIONS.SPACING * 1,
                      paddingVertical: DIMENSIONS.SPACING * 0.85,
                    }}
                  >
                    {/* Top row: icon + name + calories + chevron */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 0.5 }}>
                      <View style={{
                        width: 34, height: 34, borderRadius: 11,
                        backgroundColor: colors.cardBackgroundSecondary,
                        alignItems: 'center', justifyContent: 'center',
                        marginRight: DIMENSIONS.SPACING * 0.7,
                      }}>
                        <Ionicons name={mealIcon as any} size={TYPOGRAPHY.bodyM} color={colors.textPrimary} />
                      </View>
                      <Text style={{
                        flex: 1, fontSize: TYPOGRAPHY.bodyM, fontWeight: '700',
                        color: colors.textPrimary,
                      }} numberOfLines={1}>
                        {meal.food_name}
                      </Text>
                      <View style={{ alignItems: 'flex-end', marginRight: 6 }}>
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
                      />
                    </View>

                    {/* Macro chips */}
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: DIMENSIONS.SPACING * 0.45 }}>
                      {[
                        { label: t('log.protein'), val: meal.protein, color: MACRO_COLORS.protein },
                        { label: t('log.carbs'), val: meal.carbs, color: MACRO_COLORS.carbs },
                        { label: t('log.fat'), val: meal.fat, color: MACRO_COLORS.fat },
                      ].map((m) => (
                        <View key={m.label} style={{
                          flexDirection: 'row', alignItems: 'center',
                          backgroundColor: m.color + '18',
                          borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
                          gap: 3,
                        }}>
                          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: m.color }} />
                          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: m.color }}>
                            {m.val}g
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Macro proportion bar */}
                    <View style={{ flexDirection: 'row', height: 3, borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ width: `${proteinPct}%`, backgroundColor: MACRO_COLORS.protein }} />
                      <View style={{ width: `${carbsPct}%`, backgroundColor: MACRO_COLORS.carbs }} />
                      <View style={{ width: `${fatPct}%`, backgroundColor: MACRO_COLORS.fat }} />
                    </View>
                  </TouchableOpacity>

                  {/* Action row — expands on tap */}
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
                          gap: 6, paddingVertical: DIMENSIONS.SPACING * 0.7,
                          borderRightWidth: 1, borderRightColor: colors.borderPrimary,
                        }}
                      >
                        <Ionicons name="create-outline" size={TYPOGRAPHY.bodyM} color={colors.textPrimary} />
                        <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textPrimary }}>
                          编辑
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(meal)}
                        style={{
                          flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                          gap: 6, paddingVertical: DIMENSIONS.SPACING * 0.7,
                        }}
                      >
                        <Ionicons name="trash-outline" size={TYPOGRAPHY.bodyM} color="#EF4444" />
                        <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: '#EF4444' }}>
                          删除
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
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
