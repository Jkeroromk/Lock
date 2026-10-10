import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/i18n';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/hooks/useTheme';
import { FONTS } from '@/constants/fonts';
import { Card, Label } from '@/components/ui/bxc';

interface WeeklyCaloriesChartProps {
  chartData: Array<{ day: string; calories: number }>;
}

const BAR_HEIGHT = 120;

/** Last 7 days of calories against the goal line. Yellow = goal hit. */
export default function WeeklyCaloriesChart({ chartData }: WeeklyCaloriesChartProps) {
  const { t } = useTranslation();
  const c = useTheme();
  const { dailyCalorieGoal } = useStore();
  const goal = dailyCalorieGoal || 2000;
  const isLight = c.backgroundPrimary !== c.ink;

  const maxCalories = Math.max(...chartData.map((d) => d.calories), goal) * 1.08;
  const logged = chartData.filter((d) => d.calories > 0);
  const avg = logged.length ? Math.round(logged.reduce((s, d) => s + d.calories, 0) / logged.length) : 0;
  const goalY = (goal / maxCalories) * BAR_HEIGHT;

  const barColor = (calories: number) => {
    const pct = calories / goal;
    if (pct >= 1) return c.accent;
    if (pct >= 0.8) return c.textPrimary;
    if (pct >= 0.6) return '#8C8B86';
    return isLight ? '#C9C8C2' : '#3A3A3A';
  };

  return (
    <Card padding={16} style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: c.textPrimary }}>{t('calendar.weeklyCalories')}</Text>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary }}>AVG {avg.toLocaleString()} KCAL</Text>
      </View>

      <View style={{ height: BAR_HEIGHT, marginTop: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: goalY, height: 1.5, backgroundColor: c.textSecondary, opacity: 0.5 }} />
        {chartData.map((d, i) => (
          <View
            key={i}
            accessible
            accessibilityLabel={`${d.day}: ${d.calories} kcal`}
            style={{
              flex: 1, borderRadius: 6,
              height: d.calories > 0 ? Math.max((d.calories / maxCalories) * BAR_HEIGHT, 6) : 4,
              backgroundColor: d.calories > 0 ? barColor(d.calories) : c.track,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
        {chartData.map((d, i) => (
          <Text key={i} style={{
            flex: 1, textAlign: 'center', fontFamily: FONTS.mono, fontSize: 10,
            color: i === chartData.length - 1 ? c.textPrimary : c.textSecondary,
          }}>
            {d.day}
          </Text>
        ))}
      </View>
      <Label style={{ fontSize: 10, marginTop: 10 }}>{t('settings.goals')} {goal.toLocaleString()} KCAL</Label>
    </Card>
  );
}
