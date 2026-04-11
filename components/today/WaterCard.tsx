import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';

interface WaterCardProps {
  glasses: number;
  goal: number;
  onAdd: () => void;
  onRemove: () => void;
}

const GLASS_ML = 250;

export default function WaterCard({ glasses, goal, onAdd, onRemove }: WaterCardProps) {
  const colors = useTheme();
  const { t } = useTranslation();
  const percent = Math.min(glasses / goal, 1);
  const totalMl = glasses * GLASS_ML;
  const remaining = Math.max(goal - glasses, 0);
  const isComplete = glasses >= goal;

  return (
    <View style={{
      borderRadius: 20,
      backgroundColor: colors.cardBackground,
      borderWidth: 1, borderColor: colors.borderPrimary,
      padding: DIMENSIONS.SPACING * 1.2,
      marginBottom: DIMENSIONS.SPACING,
    }}>
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{
            width: 32, height: 32, borderRadius: 10,
            backgroundColor: '#3B82F622',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name="water" size={16} color="#3B82F6" />
          </View>
          <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>
            {t('water.title')}
          </Text>
        </View>
        {/* +/- buttons */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={onRemove}
            disabled={glasses === 0}
            style={{
              width: 32, height: 32, borderRadius: 10,
              backgroundColor: colors.cardBackgroundSecondary,
              borderWidth: 1.5, borderColor: colors.borderPrimary,
              alignItems: 'center', justifyContent: 'center',
              opacity: glasses === 0 ? 0.35 : 1,
            }}
          >
            <Ionicons name="remove" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onAdd}
            disabled={isComplete}
            style={{
              width: 32, height: 32, borderRadius: 10,
              backgroundColor: isComplete ? colors.borderPrimary : '#3B82F6',
              alignItems: 'center', justifyContent: 'center',
              opacity: isComplete ? 0.4 : 1,
            }}
          >
            <Ionicons name="add" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress bar */}
      <View style={{
        height: 6, borderRadius: 3,
        backgroundColor: colors.borderPrimary,
        marginBottom: DIMENSIONS.SPACING * 0.8,
        overflow: 'hidden',
      }}>
        <View style={{
          height: '100%',
          width: `${percent * 100}%`,
          borderRadius: 3,
          backgroundColor: '#3B82F6',
        }} />
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING * 0.8 }}>
        <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary, fontWeight: '600' }}>
          {totalMl} {t('water.ml')} / {goal * GLASS_ML} {t('water.ml')}
        </Text>
        <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: '#3B82F6', fontWeight: '700' }}>
          {Math.round(percent * 100)}%
        </Text>
      </View>

      {/* Glasses grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: DIMENSIONS.SPACING * 0.6 }}>
        {Array.from({ length: goal }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 26, height: 26, borderRadius: 8,
              backgroundColor: i < glasses ? '#3B82F6' : colors.borderPrimary,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="water" size={12} color={i < glasses ? '#ffffff' : colors.textSecondary} />
          </View>
        ))}
      </View>

      {/* Status text */}
      <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: isComplete ? '#3B82F6' : colors.textSecondary, fontWeight: '600' }}>
        {isComplete
          ? t('water.achieved')
          : t('water.remaining').replace('{count}', String(remaining)).replace('{ml}', String(remaining * GLASS_ML))}
      </Text>
    </View>
  );
}
