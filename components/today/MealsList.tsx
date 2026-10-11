import { View, TouchableOpacity, Alert, Image } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { Card } from '@/components/ui/bxc';
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
  image_url?: string | null;
}

interface MealsListProps {
  meals: Meal[];
}

/** Server copy (signed https URL) or, for older meals, the copy saved on this device. */
const hasPhoto = (url?: string | null) => !!url && (url.startsWith('https://') || url.startsWith('file://'));

export default function MealsList({ meals }: MealsListProps) {
  const { t } = useTranslation();
  const c = useTheme();
  const { removeMealOptimistic, refreshToday } = useStore();
  const [activeMealId, setActiveMealId] = useState<string | null>(null);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Thumbnails whose file is gone (reinstall, other device) fall back to the icon.
  const [brokenPhotos, setBrokenPhotos] = useState<Set<string>>(() => new Set());

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

  const isLight = c.backgroundPrimary !== c.ink;

  return (
    <View style={{ marginBottom: 14 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4, marginBottom: 10 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.8, color: c.textPrimary }}>{t('today.plates')}</Text>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.textSecondary }}>
          {meals.length > 0 ? `${Math.round(totalCalories).toLocaleString()} ${t('today.kcal')}` : ''}
        </Text>
      </View>

      {meals.length === 0 ? (
        <Card padding={24} style={{ alignItems: 'center' }}>
          <View style={{ width: 56, height: 56, borderRadius: 16, borderWidth: 2, borderColor: c.borderPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: 12, transform: [{ rotate: '-4deg' }] }}>
            <Ionicons name="camera-outline" size={26} color={c.textPrimary} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: c.textPrimary, marginBottom: 4 }}>{t('today.noMeals')}</Text>
          <Text style={{ fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20 }}>{t('today.startRecording')}</Text>
        </Card>
      ) : (
        <View style={{ gap: 8 }}>
          {meals.map((meal, index) => {
            const photo = hasPhoto(meal.image_url) && !brokenPhotos.has(meal.image_url!) ? meal.image_url! : null;
            const rowId = meal.id ?? String(index);
            const isActive = activeMealId === rowId;
            const isDeleting = deletingId === meal.id;

            return (
              <View
                key={rowId}
                style={{
                  backgroundColor: c.cardBackground, borderRadius: 18, borderWidth: 2,
                  borderColor: isActive ? c.textPrimary : c.borderPrimary,
                  overflow: 'hidden', opacity: isDeleting ? 0.4 : 1,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveMealId(isActive ? null : rowId)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isActive }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingLeft: 9, paddingRight: 14 }}
                >
                  <View style={{
                    width: 46, height: 46, borderRadius: 12, overflow: 'hidden',
                    backgroundColor: c.cardBackgroundSecondary,
                    borderWidth: isLight ? 1.5 : 0, borderColor: c.ink,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {photo ? (
                      <Image
                        source={{ uri: photo }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                        accessibilityIgnoresInvertColors
                        onError={() => setBrokenPhotos((prev) => new Set(prev).add(photo))}
                      />
                    ) : (
                      <Ionicons name="restaurant-outline" size={20} color={c.textPrimary} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: c.textPrimary }} numberOfLines={1}>{meal.food_name}</Text>
                    <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary, marginTop: 2 }} numberOfLines={1}>
                      P{Math.round(meal.protein)} C{Math.round(meal.carbs)} F{Math.round(meal.fat)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: c.textPrimary }}>{Math.round(meal.calories)}</Text>
                </TouchableOpacity>

                {isActive && (
                  <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 9, paddingBottom: 9 }}>
                    <TouchableOpacity
                      onPress={() => { setEditingMeal(meal); setActiveMealId(null); }}
                      accessibilityRole="button"
                      style={{ flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 13, borderWidth: 2, borderColor: c.textPrimary }}
                    >
                      <Ionicons name="create-outline" size={16} color={c.textPrimary} />
                      <Text style={{ fontFamily: FONTS.mono, fontWeight: '600', fontSize: 13, color: c.textPrimary }}>{t('log.edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(meal)}
                      disabled={isDeleting}
                      accessibilityRole="button"
                      style={{ flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 13, borderWidth: 2, borderColor: c.danger }}
                    >
                      <Ionicons name="trash-outline" size={16} color={c.danger} />
                      <Text style={{ fontFamily: FONTS.mono, fontWeight: '600', fontSize: 13, color: c.danger }}>
                        {isDeleting ? t('common.deleting' as any) : t('common.delete')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {editingMeal && (
        <EditMealModal meal={editingMeal} visible={true} onClose={() => setEditingMeal(null)} onSaved={() => refreshToday()} />
      )}
    </View>
  );
}
