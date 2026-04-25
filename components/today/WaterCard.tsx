import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { GLASS_ML } from '@/services/waterTracker';

interface WaterCardProps {
  waterMl: number;
  goalMl: number;
  onAdd: () => void;
  onRemove: () => void;
}

export default function WaterCard({ waterMl, goalMl, onAdd, onRemove }: WaterCardProps) {
  const colors = useTheme();
  const { t } = useTranslation();
  const percent = Math.min(waterMl / goalMl, 1);
  const isComplete = waterMl >= goalMl;
  const glassesEquiv = Math.ceil(goalMl / GLASS_ML);

  const fillWidth = useSharedValue(0);

  useEffect(() => {
    fillWidth.value = withSpring(percent, { damping: 18, stiffness: 120 });
  }, [percent]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value * 100}%`,
  }));

  return (
    <View style={{
      borderRadius: 20,
      backgroundColor: colors.cardBackground,
      borderWidth: 1, borderColor: colors.borderPrimary,
      padding: DIMENSIONS.SPACING * 1.1,
      marginBottom: DIMENSIONS.SPACING,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING * 0.9 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="water" size={18} color="#3B82F6" />
          <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>
            {t('water.title')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            onPress={onRemove}
            disabled={waterMl <= 0}
            style={{
              width: 30, height: 30, borderRadius: 9,
              backgroundColor: colors.cardBackgroundSecondary,
              borderWidth: 1.5, borderColor: colors.borderPrimary,
              alignItems: 'center', justifyContent: 'center',
              opacity: waterMl <= 0 ? 0.3 : 1,
            }}
          >
            <Ionicons name="remove" size={15} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onAdd}
            style={{
              width: 30, height: 30, borderRadius: 9,
              backgroundColor: '#3B82F6',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="add" size={15} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main content */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: DIMENSIONS.SPACING }}>
        {/* ml count */}
        <View style={{ alignItems: 'center', minWidth: 64 }}>
          <Text style={{ fontSize: TYPOGRAPHY.numberL * 0.75, fontWeight: '900', color: isComplete ? '#3B82F6' : colors.textPrimary, lineHeight: TYPOGRAPHY.numberL * 0.8 }}>
            {waterMl}
          </Text>
          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary }}>
            / {goalMl} {t('water.ml')}
          </Text>
        </View>

        <View style={{ flex: 1, gap: DIMENSIONS.SPACING * 0.5 }}>
          {/* Animated progress bar */}
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.borderPrimary, overflow: 'hidden' }}>
            <Animated.View style={[{ height: '100%', borderRadius: 4, backgroundColor: '#3B82F6' }, fillStyle]} />
          </View>

          {/* Glass dots */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {Array.from({ length: glassesEquiv }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: 10, height: 10, borderRadius: 5,
                  backgroundColor: i * GLASS_ML < waterMl ? '#3B82F6' : colors.borderPrimary,
                }}
              />
            ))}
          </View>

          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: isComplete ? '#3B82F6' : colors.textSecondary }}>
            {isComplete
              ? t('water.achieved')
              : t('water.remaining').replace('{ml}', String(Math.max(goalMl - waterMl, 0)))}
          </Text>
        </View>
      </View>
    </View>
  );
}
