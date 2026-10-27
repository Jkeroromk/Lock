import { View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '@/components/ui/Text';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { useStore } from '@/store/useStore';
import { useCalorieStatus } from '@/lib/calorieStatus';
import { useCalorieGoal } from '@/hooks/useDailyGoals';
import { FONTS } from '@/constants/fonts';
import { Bar, Button, Card, IconButton, Label, RADIUS, STROKE } from '@/components/ui/bxc';
import { macroTargets } from '@/components/today/CaloriesCard';

export interface FoodResult {
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  /** Product photo from a barcode lookup. */
  imageUrl?: string;
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
  /** Put this result on the 待记录 list and go scan the next one. */
  onAddToList?: () => void;
}

const MACROS = ['protein', 'carbs', 'fat'] as const;

/** AI / barcode result: hero card with kcal, macro bars (share of today's target) and save. */
export default function ResultCard({ result, isEditing, editedData, saving, onEdit, onCancelEdit, onSaveEdit, onChange, onSaveMeal, onAddToList }: Props) {
  const c = useTheme();
  const { t } = useTranslation();
  const user = useStore((st) => st.user);
  const { goal: calorieGoal } = useCalorieGoal();
  const projected = useCalorieStatus(result.calories);
  const projectedWarn = projected.level === 'over' || projected.level === 'way';
  const targets = macroTargets(calorieGoal, user);

  const inputStyle = {
    color: c.textPrimary, borderWidth: STROKE.control, borderColor: c.textPrimary, borderRadius: RADIUS.control,
    paddingHorizontal: 10, paddingVertical: 8, backgroundColor: c.backgroundPrimary,
  };

  return (
    <Card variant="hero" padding={16} style={{ marginBottom: 14 }}>
      {/* Name + kcal */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        {result.imageUrl && !isEditing ? (
          <View style={{ width: 64, height: 64, borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: c.borderSecondary, backgroundColor: '#FFFFFF' }}>
            <Image source={{ uri: result.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessibilityIgnoresInvertColors />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          {isEditing ? (
            <TextInput
              value={editedData.food}
              onChangeText={(v) => onChange('food', v)}
              accessibilityLabel={t('log.foodName' as any)}
              style={[inputStyle, { fontSize: 20, fontWeight: '800' }]}
            />
          ) : (
            <Text style={{ fontSize: 24, fontWeight: '800', letterSpacing: -0.7, lineHeight: 26, color: c.textPrimary }}>
              {result.food}
            </Text>
          )}
          <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary, marginTop: 6, textTransform: 'uppercase' }}>
            {t('log.confidence')} {(result.confidence * 100).toFixed(0)}%
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {isEditing ? (
            <TextInput
              value={editedData.calories}
              onChangeText={(v) => onChange('calories', v)}
              keyboardType="numeric"
              accessibilityLabel={t('log.calories')}
              style={[inputStyle, { fontSize: 28, fontWeight: '800', minWidth: 92, textAlign: 'right' }]}
            />
          ) : (
            <Text style={{ fontSize: 44, fontWeight: '800', letterSpacing: -2, lineHeight: 44, color: c.textPrimary }}>
              {Math.round(result.calories)}
            </Text>
          )}
          <Label style={{ fontSize: 10, marginTop: 4 }}>KCAL</Label>
        </View>
        {!isEditing ? (
          <IconButton icon="create-outline" onPress={onEdit} accessibilityLabel={t('log.edit')} style={{ marginTop: -2 }} />
        ) : null}
      </View>

      {/* Macros */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
        {MACROS.map((key) => (
          <View key={key} style={{ flex: 1 }}>
            <Label style={{ fontSize: 10 }}>{t(`log.${key}`)}</Label>
            {isEditing ? (
              <TextInput
                value={editedData[key]}
                onChangeText={(v) => onChange(key, v)}
                keyboardType="numeric"
                accessibilityLabel={t(`log.${key}`)}
                style={[inputStyle, { fontSize: 18, fontWeight: '800', marginTop: 4 }]}
              />
            ) : (
              <>
                <Text style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.6, color: c.textPrimary }}>
                  {Math.round(result[key])}g
                </Text>
                <Bar progress={targets[key] > 0 ? result[key] / targets[key] : 0} height={8} style={{ marginTop: 4 }} />
              </>
            )}
          </View>
        ))}
      </View>

      {/* What today looks like after saving this */}
      {!isEditing && projected.enabled ? (
        <View
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingVertical: 9, paddingHorizontal: 12,
            borderRadius: 12, borderWidth: 2, borderColor: projectedWarn ? c.danger : c.divider,
          }}
        >
          <Ionicons name={projectedWarn ? 'warning' : 'flag-outline'} size={16} color={projectedWarn ? c.danger : c.textSecondary} />
          <Text style={{ flex: 1, fontSize: 13, lineHeight: 18, fontWeight: projectedWarn ? '700' : '500', color: projectedWarn ? c.textPrimary : c.textSecondary }}>
            {projectedWarn
              ? t('calorieWarn.previewOver' as any, { kcal: projected.over.toLocaleString() })
              : t('calorieWarn.preview' as any, { total: projected.eaten.toLocaleString(), goal: projected.goal.toLocaleString() })}
          </Text>
        </View>
      ) : null}

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        {isEditing ? (
          <>
            <Button label={t('log.cancel')} variant="outline" onPress={onCancelEdit} style={{ flex: 1 }} />
            <Button label={t('log.saveChanges')} variant="solid" onPress={onSaveEdit} style={{ flex: 2 }} />
          </>
        ) : (
          <>
            {onAddToList ? (
              <Button
                label={t('log.addToList')}
                icon="add"
                variant="outline"
                disabled={saving}
                onPress={onAddToList}
                style={{ flex: 1 }}
              />
            ) : null}
            <Button
              label={saving ? t('log.saving' as any) : t('log.saveMeal')}
              icon="checkmark"
              loading={saving}
              onPress={onSaveMeal}
              style={{ flex: onAddToList ? 1.2 : 1 }}
            />
          </>
        )}
      </View>
    </Card>
  );
}
