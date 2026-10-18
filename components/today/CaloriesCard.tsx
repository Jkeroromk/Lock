import { View } from 'react-native';
import { macroTargets } from '@/lib/macros';
import { useProteinTarget } from '@/hooks/useProteinTarget';
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

export { macroTargets } from '@/lib/macros';

function MacroRow({ label, value, target, badge }: { label: string; value: number; target: number; badge?: string }) {
  const c = useTheme();
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
          <Label>{label}</Label>
          {badge ? (
            <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6, backgroundColor: c.accent, transform: [{ rotate: '-3deg' }] }}>
              <Text numberOfLines={1} style={{ fontFamily: FONTS.mono, fontWeight: '700', fontSize: 9, color: c.onAccent }}>{badge}</Text>
            </View>
          ) : null}
        </View>
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
  const protein_ = useProteinTarget();
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
          <MacroRow
            label={t('log.protein')}
            value={protein}
            target={protein_.target}
            badge={protein_.bonus ? t('train.proteinBadge', { n: String(protein_.bonus) }) : undefined}
          />
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
