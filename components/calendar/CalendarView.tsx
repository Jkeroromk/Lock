import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { Card, IconButton } from '@/components/ui/bxc';

export interface DayMark {
  calories: number;
  /** 0..100, calories / goal capped at 100 */
  progress: number;
}

interface CalendarViewProps {
  currentMonth: Date;
  markedDates: Record<string, DayMark>;
  todayStr: string;
  onDayPress: (dateStr: string) => void;
  onMonthChange: (month: Date) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Progress levels, strongest first. Index 4 = logged but under 40%. */
export function useLevelColors() {
  const c = useTheme();
  const isLight = c.backgroundPrimary !== c.ink;
  return isLight
    ? [
        { bg: c.accent, fg: c.ink },
        { bg: c.ink, fg: c.paper },
        { bg: '#8C8B86', fg: c.ink },
        { bg: '#C9C8C2', fg: c.ink },
        { bg: '#E4E2DB', fg: c.ink },
      ]
    : [
        { bg: c.accent, fg: c.ink },
        { bg: c.paper, fg: c.ink },
        { bg: '#8C8B86', fg: c.ink },
        { bg: '#3A3A3A', fg: c.paper },
        { bg: '#1F1F1F', fg: c.paper },
      ];
}

export function levelFor(mark?: DayMark): number | null {
  if (!mark || mark.calories <= 0) return null;
  if (mark.progress >= 100) return 0;
  if (mark.progress >= 80) return 1;
  if (mark.progress >= 60) return 2;
  if (mark.progress >= 40) return 3;
  return 4;
}

/** Month grid; each logged day is filled by how close it got to the calorie goal. */
export default function CalendarView({ currentMonth, markedDates, todayStr, onDayPress, onMonthChange }: CalendarViewProps) {
  const c = useTheme();
  const { t, language } = useTranslation();
  const levels = useLevelColors();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = new Date(year, month, 1).getDay(); // Sunday-first grid

  const monthLabel = new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' }).format(new Date(year, month, 15));
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(language, { weekday: 'narrow' }).format(new Date(2026, 1, 1 + i)), // Feb 1 2026 is a Sunday
  );

  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const legend = [
    { level: 0, label: t('calendar.legendHit' as any) },
    { level: 1, label: t('calendar.legendClose' as any) },
    { level: 2, label: t('calendar.legendOk' as any) },
    { level: 3, label: t('calendar.legendLow' as any) },
  ];

  return (
    <Card padding={14} style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <IconButton icon="chevron-back" accessibilityLabel="Previous month" onPress={() => onMonthChange(new Date(year, month - 1, 1))} />
        <Text style={{ fontFamily: FONTS.mono, fontWeight: '600', fontSize: 13, color: c.textPrimary, textTransform: 'uppercase' }}>
          {monthLabel}
        </Text>
        <IconButton icon="chevron-forward" accessibilityLabel="Next month" onPress={() => onMonthChange(new Date(year, month + 1, 1))} />
      </View>

      <View style={{ flexDirection: 'row', gap: 5, marginBottom: 6 }}>
        {weekdays.map((w, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', fontFamily: FONTS.mono, fontSize: 10, color: c.textSecondary }}>{w}</Text>
        ))}
      </View>

      <View style={{ gap: 5 }}>
        {rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: 5 }}>
            {row.map((day, di) => {
              if (day === null) return <View key={di} style={{ flex: 1, height: 38 }} />;
              const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
              const level = levelFor(markedDates[dateStr]);
              const isToday = dateStr === todayStr;
              const isFuture = dateStr > todayStr;
              const fill = level === null ? null : levels[level];
              return (
                <TouchableOpacity
                  key={di}
                  onPress={() => onDayPress(dateStr)}
                  disabled={isFuture}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${dateStr}${markedDates[dateStr]?.calories ? `, ${Math.round(markedDates[dateStr].calories)} kcal` : ''}`}
                  style={{
                    flex: 1, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: fill ? fill.bg : 'transparent',
                    borderWidth: isToday ? 2 : fill ? 0 : 1.5,
                    borderColor: isToday ? c.textPrimary : c.borderPrimary,
                    opacity: isFuture ? 0.45 : 1,
                  }}
                >
                  <Text style={{ fontFamily: FONTS.mono, fontWeight: '600', fontSize: 13, color: fill ? fill.fg : c.textSecondary }}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 }}>
        {legend.map((l) => (
          <View key={l.level} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: levels[l.level].bg }} />
            <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: c.textSecondary, textTransform: 'uppercase' }}>{l.label}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
