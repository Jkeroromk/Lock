import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { PressScale } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { useStore, type WeightUnit } from '@/store/useStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';

/**
 * kg | lb switch for the training screens. Changes the app-wide unit (same as
 * Settings → Preferences) and converts an open workout's typed weights.
 */
export default function UnitToggle({ value, height = 44 }: { value?: WeightUnit; height?: number }) {
  const c = useTheme();
  const { t } = useTranslation();
  const global = useStore((s) => s.weightUnit ?? 'kg');
  const setWeightUnit = useStore((s) => s.setWeightUnit);
  const setActiveUnit = useWorkoutStore((s) => s.setActiveUnit);
  const current = value ?? global;

  const pick = (u: WeightUnit) => {
    if (u !== global) setWeightUnit(u);
    if (useWorkoutStore.getState().active) setActiveUnit(u);
  };

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('settings.weightUnit')}
      style={{ flexDirection: 'row', height, padding: 3, gap: 2, borderRadius: 13, borderWidth: 2, borderColor: c.borderPrimary }}
    >
      {(['kg', 'lb'] as const).map((u) => {
        const on = u === current;
        return (
          <PressScale
            key={u}
            onPress={() => pick(u)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={u === 'kg' ? t('settings.unitKg') : t('settings.unitLb')}
            hitSlop={4}
            style={{
              minWidth: 36, paddingHorizontal: 8, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
              backgroundColor: on ? c.textPrimary : 'transparent',
            }}
          >
            <Text style={{ fontFamily: FONTS.mono, fontSize: 13, fontWeight: '700', color: on ? c.backgroundPrimary : c.textSecondary }}>{u}</Text>
          </PressScale>
        );
      })}
    </View>
  );
}
