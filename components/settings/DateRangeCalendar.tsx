import { useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/Text';
import { IconButton } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';

/** Local YYYY-MM-DD. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Local date for a YYYY-MM-DD key (noon, so DST never moves it to another day). */
export function keyDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

/**
 * Month grid for picking a range: the first tap sets the start, the second the
 * end (either order). Days after today can't be picked.
 */
export default function DateRangeCalendar({ from, to, onChange }: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const c = useTheme();
  const { t, language } = useTranslation();
  const today = dayKey(new Date());
  const [month, setMonth] = useState(() => {
    const d = keyDate(to || today);
    return new Date(d.getFullYear(), d.getMonth(), 1, 12);
  });
  // After the first tap we wait for the second (the end).
  const [picking, setPicking] = useState(false);

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
    const lead = first.getDay(); // Sunday first
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0, 12).getDate();
    const out: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= days; d++) out.push(dayKey(new Date(month.getFullYear(), month.getMonth(), d, 12)));
    while (out.length % 7) out.push(null);
    return out;
  }, [month]);

  const weekdays = useMemo(() => {
    const sunday = new Date(2026, 10, 1, 12); // a Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      try { return d.toLocaleDateString(language, { weekday: 'narrow' }); } catch { return 'SMTWTFS'[i]; }
    });
  }, [language]);

  const title = (() => {
    try { return month.toLocaleDateString(language, { year: 'numeric', month: 'long' }); }
    catch { return `${month.getFullYear()}-${month.getMonth() + 1}`; }
  })();

  const shift = (delta: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1, 12));
  const atCurrentMonth = month.getFullYear() === new Date().getFullYear() && month.getMonth() === new Date().getMonth();

  const tap = (key: string) => {
    if (!picking) {
      onChange(key, key);
      setPicking(true);
    } else {
      onChange(key < from ? key : from, key < from ? from : key);
      setPicking(false);
    }
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <IconButton icon="chevron-back" onPress={() => shift(-1)} accessibilityLabel={t('exportData.prevMonth')} />
        <Text style={{ fontSize: 16, fontWeight: '800', color: c.textPrimary }}>{title}</Text>
        <View style={{ opacity: atCurrentMonth ? 0.3 : 1 }} pointerEvents={atCurrentMonth ? 'none' : 'auto'}>
          <IconButton icon="chevron-forward" onPress={() => shift(1)} accessibilityLabel={t('exportData.nextMonth')} />
        </View>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {weekdays.map((w, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary, paddingVertical: 4 }}>{w}</Text>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row' }}>
          {cells.slice(row * 7, row * 7 + 7).map((key, i) => {
            if (!key) return <View key={i} style={{ flex: 1, height: 42 }} />;
            const future = key > today;
            const isEnd = key === from || key === to;
            const inside = key > from && key < to;
            return (
              <Pressable
                key={key}
                disabled={future}
                onPress={() => tap(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isEnd || inside, disabled: future }}
                accessibilityLabel={key}
                style={{ flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: inside ? c.cardBackgroundSecondary : 'transparent' }}
              >
                <View style={{
                  width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isEnd ? c.textPrimary : 'transparent',
                  borderWidth: key === today && !isEnd ? 1.5 : 0, borderColor: c.textPrimary,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: isEnd ? '800' : '600', color: isEnd ? c.backgroundPrimary : c.textPrimary, opacity: future ? 0.3 : 1 }}>
                    {Number(key.slice(8))}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
      <Text style={{ fontSize: 12, color: c.textSecondary, marginTop: 6 }}>
        {picking ? t('exportData.pickEnd') : t('exportData.pickStart')}
      </Text>
    </View>
  );
}
