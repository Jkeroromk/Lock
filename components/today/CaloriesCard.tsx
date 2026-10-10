import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { useStore } from '@/store/useStore';
import { FONTS } from '@/constants/fonts';
import { Card, Ring, Bar, Label } from '@/components/ui/bxc';

interface CaloriesCardProps {
  todayCalories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Macro targets derived from the calorie goal with a standard 30/45/25 split
 * (protein / carbs / fat). Users don't set macro goals yet.
 */
export function macroTargets(calorieGoal: number) {
  return {
    protein: Math.round((calorieGoal * 0.3) / 4),
    carbs: Math.round((calorieGoal * 0.45) / 4),
    fat: Math.round((calorieGoal * 0.25) / 9),
  };
}

function MacroRow({ label, value, target }: { label: string; value: number; target: number }) {
  const c = useTheme();
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Label>{label}</Label>
        <Text style={{ fontFamily: FONTS.mono, fontWeight: '500', fontSize: 11, color: c.textPrimary }}>
          {Math.round(value)}/{target}g
        </Text>
      </View>
      <Bar progress={target > 0 ? value / target : 0} style={{ marginTop: 5 }} />
    </View>
  );
}

export default function CaloriesCard({ todayCalories, protein, carbs, fat }: CaloriesCardProps) {
  const { t } = useTranslation();
  const c = useTheme();
  const { dailyCalorieGoal } = useStore();

  const goal = dailyCalorieGoal || 2000;
  const eaten = Math.round(todayCalories);
  const over = eaten > goal;
  const left = Math.abs(goal - eaten);
  const targets = macroTargets(goal);
  const isLight = c.backgroundPrimary !== c.ink;

  return (
    <Card variant="hero" padding={18} style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Ring
          size={136}
          stroke={14}
          progress={goal > 0 ? eaten / goal : 0}
          color={over ? c.danger : c.accent}
          outlineColor={isLight ? c.ink : undefined}
          accessibilityLabel={`${eaten} of ${goal} kcal`}
        >
          <Text style={{ fontSize: 34, fontWeight: '800', letterSpacing: -1.5, color: c.textPrimary }}>
            {left.toLocaleString()}
          </Text>
          <Label style={{ fontSize: 10, marginTop: 1 }}>{over ? t('today.kcalOver') : t('today.kcalLeft')}</Label>
        </Ring>

        <View style={{ flex: 1, gap: 11 }}>
          <MacroRow label={t('log.protein')} value={protein} target={targets.protein} />
          <MacroRow label={t('log.carbs')} value={carbs} target={targets.carbs} />
          <MacroRow label={t('log.fat')} value={fat} target={targets.fat} />
          <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary }}>
            {t('today.eatenOfGoal', { eaten: eaten.toLocaleString(), goal: goal.toLocaleString() })}
          </Text>
        </View>
      </View>
    </Card>
  );
}
