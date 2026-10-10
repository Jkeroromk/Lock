import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { FONTS } from '@/constants/fonts';
import { Card, Label } from '@/components/ui/bxc';

interface NutritionStat {
  label: string;
  value: number;
  color: string;
}

interface WeeklyNutritionBreakdownProps {
  stats: NutritionStat[];
}

/** One stacked bar (share of grams) plus a row per macro. */
export default function WeeklyNutritionBreakdown({ stats }: WeeklyNutritionBreakdownProps) {
  const { t } = useTranslation();
  const c = useTheme();
  const sum = stats.reduce((s, d) => s + d.value, 0);
  const total = sum || 1;

  return (
    <Card padding={16} style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: c.textPrimary }}>{t('calendar.weeklyNutrition')}</Text>

      <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: c.textPrimary, overflow: 'hidden', marginTop: 14 }}>
        {sum > 0 ? stats.map((s, i) => (
          <View key={i} style={{ flex: s.value / total, backgroundColor: s.color }} />
        )) : null}
      </View>

      <View style={{ marginTop: 14, gap: 10 }}>
        {stats.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: s.color, borderWidth: 1.5, borderColor: c.textPrimary }} />
              <Label>{s.label}</Label>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: c.textPrimary }}>{s.value}g</Text>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary }}>
                {sum > 0 ? Math.round((s.value / total) * 100) : 0}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}
