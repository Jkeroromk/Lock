import { View, Text, TextInput, TouchableOpacity, Modal, Alert, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { updateMeal } from '@/services/api';

interface Meal {
  id?: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Props {
  meal: Meal;
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditMealModal({ meal, visible, onClose, onSaved }: Props) {
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
      onSaved(); onClose();
    } catch (err: any) {
      Alert.alert(t('weightTracker.saveFailed'), err.message || t('common.retry'));
    } finally { setSaving(false); }
  };

  const fieldStyle = {
    backgroundColor: colors.cardBackgroundSecondary, borderRadius: 12,
    borderWidth: 1, borderColor: colors.borderPrimary,
    paddingHorizontal: DIMENSIONS.SPACING * 0.8, paddingVertical: DIMENSIONS.SPACING * 0.6,
    fontSize: TYPOGRAPHY.bodyM as number, fontWeight: '700' as const, color: colors.textPrimary,
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: colors.backgroundPrimary, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.borderPrimary, paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingTop: DIMENSIONS.SPACING, paddingBottom: DIMENSIONS.SPACING * 1.5 }}>
            <View style={{ alignItems: 'center', marginBottom: DIMENSIONS.SPACING }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.borderPrimary }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING }}>
              <Text style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: colors.textPrimary }}>{t('log.edit')}</Text>
              <TouchableOpacity onPress={onClose} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.cardBackgroundSecondary, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{t('log.analyzeFood')}</Text>
            <TextInput value={foodName} onChangeText={setFoodName} style={{ ...fieldStyle, marginBottom: DIMENSIONS.SPACING }} placeholderTextColor={colors.textSecondary} />

            <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{t('log.calories')}</Text>
            <TextInput value={calories} onChangeText={setCalories} keyboardType="numeric" style={{ ...fieldStyle, marginBottom: DIMENSIONS.SPACING }} placeholderTextColor={colors.textSecondary} />

            <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              {t('log.protein')} / {t('log.carbs')} / {t('log.fat')} (g)
            </Text>
            <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.5, marginBottom: DIMENSIONS.SPACING * 1.2 }}>
              {[
                { label: t('log.protein'), val: protein, set: setProtein },
                { label: t('log.carbs'), val: carbs, set: setCarbs },
                { label: t('log.fat'), val: fat, set: setFat },
              ].map((m) => (
                <View key={m.label} style={{ flex: 1 }}>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textSecondary, textAlign: 'center', marginBottom: 4 }}>{m.label}</Text>
                  <TextInput value={m.val} onChangeText={m.set} keyboardType="numeric" style={{ ...fieldStyle, textAlign: 'center' }} placeholderTextColor={colors.textSecondary} />
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.5 }}>
              <TouchableOpacity onPress={onClose} style={{ flex: 1, paddingVertical: DIMENSIONS.SPACING * 0.85, borderRadius: 16, alignItems: 'center', backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.borderPrimary }}>
                <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.textPrimary }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={saving} style={{ flex: 2, paddingVertical: DIMENSIONS.SPACING * 0.85, borderRadius: 16, alignItems: 'center', backgroundColor: colors.textPrimary, opacity: saving ? 0.6 : 1 }}>
                {saving
                  ? <ActivityIndicator color={colors.backgroundPrimary} size="small" />
                  : <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.backgroundPrimary }}>{t('common.save')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
