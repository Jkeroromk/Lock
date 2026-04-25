import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

const MACRO_COLORS = { protein: '#6366F1', carbs: '#F59E0B', fat: '#F97316' };

export interface FoodResult {
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}

interface Props {
  result: FoodResult;
  isEditing: boolean;
  editedData: { food: string; calories: string; protein: string; carbs: string; fat: string };
  saving: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onChange: (key: string, val: string) => void;
  onSaveMeal: () => void;
}

export default function ResultCard({ result, isEditing, editedData, saving, onEdit, onCancelEdit, onSaveEdit, onChange, onSaveMeal }: Props) {
  const colors = useTheme();
  const { t } = useTranslation();

  return (
    <View style={{ borderRadius: 24, marginBottom: DIMENSIONS.SPACING, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.borderPrimary, overflow: 'hidden' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: DIMENSIONS.SPACING * 1.2, borderBottomWidth: 1, borderBottomColor: colors.borderPrimary }}>
        <View style={{ flex: 1 }}>
          {isEditing ? (
            <TextInput
              value={editedData.food} onChangeText={(v) => onChange('food', v)}
              style={{ fontSize: TYPOGRAPHY.title, fontWeight: '900', color: colors.textPrimary, backgroundColor: colors.cardBackgroundSecondary, borderRadius: 10, paddingHorizontal: DIMENSIONS.SPACING * 0.6, paddingVertical: DIMENSIONS.SPACING * 0.4, borderWidth: 1, borderColor: colors.borderPrimary }}
              placeholderTextColor={colors.textSecondary}
            />
          ) : (
            <Text style={{ fontSize: TYPOGRAPHY.title, fontWeight: '900', color: colors.textPrimary, lineHeight: TYPOGRAPHY.title * 1.2 }}>{result.food}</Text>
          )}
          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textSecondary, marginTop: 4 }}>
            {t('log.confidence')}：{(result.confidence * 100).toFixed(0)}%
          </Text>
        </View>
        {!isEditing && (
          <TouchableOpacity onPress={onEdit} style={{ padding: DIMENSIONS.SPACING * 0.6, borderRadius: 10, backgroundColor: colors.cardBackgroundSecondary, borderWidth: 1, borderColor: colors.borderPrimary, marginLeft: DIMENSIONS.SPACING * 0.8 }}>
            <Ionicons name="create-outline" size={TYPOGRAPHY.iconXS} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Calories */}
      <View style={{ paddingHorizontal: DIMENSIONS.SPACING * 1.4, paddingVertical: DIMENSIONS.SPACING * 1.2, borderBottomWidth: 1, borderBottomColor: colors.borderPrimary, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        {isEditing ? (
          <TextInput value={editedData.calories} onChangeText={(v) => onChange('calories', v)} keyboardType="numeric"
            style={{ fontSize: TYPOGRAPHY.numberL, fontWeight: '900', color: colors.textPrimary, backgroundColor: colors.cardBackgroundSecondary, borderRadius: 10, paddingHorizontal: DIMENSIONS.SPACING * 0.6, paddingVertical: DIMENSIONS.SPACING * 0.3, borderWidth: 1, borderColor: colors.borderPrimary, minWidth: 120 }}
            placeholderTextColor={colors.textSecondary} />
        ) : (
          <Text style={{ fontSize: TYPOGRAPHY.numberL, fontWeight: '900', color: colors.textPrimary, lineHeight: TYPOGRAPHY.numberL * 1.05 }}>{result.calories}</Text>
        )}
        <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>{t('log.calories')}</Text>
      </View>

      {/* Macros */}
      <View style={{ flexDirection: 'row', padding: DIMENSIONS.SPACING * 1.2 }}>
        {([
          { label: t('log.protein'), key: 'protein', color: MACRO_COLORS.protein },
          { label: t('log.carbs'), key: 'carbs', color: MACRO_COLORS.carbs },
          { label: t('log.fat'), key: 'fat', color: MACRO_COLORS.fat },
        ] as const).map((macro, i) => (
          <View key={macro.key} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: colors.borderPrimary }}>
            <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{macro.label}</Text>
            {isEditing ? (
              <TextInput value={editedData[macro.key]} onChangeText={(v) => onChange(macro.key, v)} keyboardType="numeric"
                style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: macro.color, backgroundColor: colors.cardBackgroundSecondary, borderRadius: 8, paddingHorizontal: DIMENSIONS.SPACING * 0.5, paddingVertical: DIMENSIONS.SPACING * 0.3, borderWidth: 1, borderColor: colors.borderPrimary, textAlign: 'center', minWidth: DIMENSIONS.SCREEN_WIDTH * 0.18 }}
                placeholderTextColor={colors.textSecondary} />
            ) : (
              <Text style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: macro.color }}>{(result as any)[macro.key]}g</Text>
            )}
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.6, padding: DIMENSIONS.SPACING * 1.2, borderTopWidth: 1, borderTopColor: colors.borderPrimary }}>
        {isEditing ? (
          <>
            <TouchableOpacity onPress={onCancelEdit} activeOpacity={0.8} style={{ flex: 1, borderRadius: 16, paddingVertical: DIMENSIONS.SPACING * 0.9, alignItems: 'center', backgroundColor: colors.cardBackgroundSecondary, borderWidth: 1, borderColor: colors.borderPrimary }}>
              <Text style={{ fontSize: TYPOGRAPHY.body, fontWeight: '800', color: colors.textPrimary }}>{t('log.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onSaveEdit} activeOpacity={0.8} style={{ flex: 2, borderRadius: 16, paddingVertical: DIMENSIONS.SPACING * 0.9, alignItems: 'center', backgroundColor: colors.textPrimary }}>
              <Text style={{ fontSize: TYPOGRAPHY.body, fontWeight: '800', color: colors.backgroundPrimary }}>{t('log.saveChanges')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={onSaveMeal} disabled={saving} activeOpacity={0.8} style={{ flex: 1, borderRadius: 16, paddingVertical: DIMENSIONS.SPACING * 0.9, alignItems: 'center', backgroundColor: colors.textPrimary, opacity: saving ? 0.6 : 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {saving
                ? <ActivityIndicator color={colors.backgroundPrimary} size="small" />
                : <Ionicons name="checkmark-circle" size={TYPOGRAPHY.iconS} color={colors.backgroundPrimary} />}
              <Text style={{ fontSize: TYPOGRAPHY.body, fontWeight: '800', color: colors.backgroundPrimary }}>
                {saving ? t('log.saving' as any) : t('log.saveMeal')}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
