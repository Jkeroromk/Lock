import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { useStore } from '@/store/useStore';
import { FONTS } from '@/constants/fonts';
import { Card, Label } from '@/components/ui/bxc';
import type { DayMark } from '@/components/calendar/CalendarView';

interface MonthlyStatsProps {
  markedDates: Record<string, DayMark>;
  avgDailyCalories: number;
}

export default function MonthlyStats({ markedDates, avgDailyCalories }: MonthlyStatsProps) {
  const { t } = useTranslation();
  const c = useTheme();
  const { dailyCalorieGoal } = useStore();

  const days = Object.values(markedDates);
  const logged = days.filter((d) => d.calories > 0);
  const completedDays = days.filter((d) => d.progress >= 100).length;
  const avgProgress = logged.length === 0 ? 0 : logged.reduce((s, d) => s + d.progress, 0) / logged.length;

  const stats = [
    { label: t('calendar.completedDays'), value: `${completedDays}`, unit: t('dashboard.days'), highlight: true },
    { label: t('calendar.avgProgress'), value: `${Math.round(avgProgress)}%`, unit: '' },
    { label: t('calendar.avgDaily'), value: avgDailyCalories.toLocaleString(), unit: 'kcal' },
    { label: t('today.target'), value: (dailyCalorieGoal || 2000).toLocaleString(), unit: 'kcal' },
  ];

  return (
    <Card padding={16} style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: c.textPrimary, marginBottom: 12 }}>{t('calendar.monthlyStats')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {stats.map((s, i) => (
          <View key={i} style={{
            flexGrow: 1, flexBasis: '45%', borderRadius: 16, padding: 12,
            backgroundColor: s.highlight ? c.accent : 'transparent',
            borderWidth: 2, borderColor: s.highlight ? c.ink : c.borderPrimary,
          }}>
            <Label color={s.highlight ? c.onAccent : undefined} style={{ fontSize: 10 }}>{s.label}</Label>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              <Text style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.8, color: s.highlight ? c.onAccent : c.textPrimary }}>{s.value}</Text>
              {s.unit ? (
                <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: s.highlight ? c.onAccent : c.textSecondary }}>{s.unit}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}
