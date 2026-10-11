import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { useStore } from '@/store/useStore';
import { FONTS } from '@/constants/fonts';
import { Card, Ring, Bar, Label } from '@/components/ui/bxc';
import { Ionicons } from '@expo/vector-icons';
import { calorieLevel } from '@/lib/calorieStatus';

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
  const { dailyCalorieGoal, calorieWarnings, user } = useStore();

  const goal = dailyCalorieGoal || 2000;
  const eaten = Math.round(todayCalories);
  const over = eaten > goal;
  const left = Math.abs(goal - eaten);
  const targets = macroTargets(goal);
  const isLight = c.backgroundPrimary !== c.ink;
  const level = calorieWarnings ? calorieLevel(eaten, goal, user?.goal) : 'ok';
  const warn = level === 'over' || level === 'way';
  // Text on the solid red banner: white on light red, ink on the brighter dark-mode red.
  const onDanger = isLight ? '#fff' : c.ink;

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

      {warn ? (
        <View
          accessibilityRole="alert"
          style={{
            flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 14, padding: 12,
            borderRadius: 14, borderWidth: 2, borderColor: c.danger,
            backgroundColor: level === 'way' ? c.danger : 'transparent',
          }}
        >
          <Ionicons name="warning" size={18} color={level === 'way' ? onDanger : c.danger} style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: level === 'way' ? onDanger : c.textPrimary }}>
              {t('calorieWarn.overTitle' as any, { kcal: (eaten - goal).toLocaleString() })}
            </Text>
            <Text style={{ fontSize: 13, lineHeight: 18, marginTop: 2, color: level === 'way' ? onDanger : c.textSecondary }}>
              {t((level === 'way' ? 'calorieWarn.wayTip' : 'calorieWarn.overTip') as any)}
            </Text>
          </View>
        </View>
      ) : level === 'near' ? (
        <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.textSecondary, marginTop: 12 }}>
          {t('calorieWarn.nearTitle' as any, { kcal: (goal - eaten).toLocaleString() })}
        </Text>
      ) : null}
    </Card>
  );
}
