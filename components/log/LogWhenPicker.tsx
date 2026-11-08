import { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Chip, Label, RADIUS, STROKE } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { useShallow } from 'zustand/react/shallow';
import { BACKDATE_DAYS, MealSlot, SLOT_TIME, slotDate, useLogWhenStore } from '@/store/useLogWhenStore';

const SLOTS: Exclude<MealSlot, 'now'>[] = ['breakfast', 'lunch', 'snack', 'dinner'];

/** "今天" / "昨天" / "周四 11/5". */
export function dayLabel(offset: number, t: (k: string) => string, language: string): string {
  if (offset === 0) return t('quickLog.today');
  if (offset === 1) return t('quickLog.yesterday');
  const d = new Date();
  d.setDate(d.getDate() - offset);
  try {
    return d.toLocaleDateString(language, { weekday: 'short', month: 'numeric', day: 'numeric' });
  } catch {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
}

/** "现在" / "今天 · 午餐" / "昨天 · 晚餐". */
export function whenLabel(dayOffset: number, slot: MealSlot, t: (k: string) => string, language: string): string {
  if (dayOffset === 0 && slot === 'now') return t('quickLog.now');
  return `${dayLabel(dayOffset, t, language)} · ${t(`quickLog.${slot}`)}`;
}

/**
 * 补记: a one-line "什么时候吃的 · 现在" row that opens day and meal chips.
 * Shared by the result card and the to-log list; reset after each save.
 */
export default function LogWhenPicker({ style }: { style?: any }) {
  const c = useTheme();
  const { t, language } = useTranslation();
  const { dayOffset, slot, setDay, setSlot } = useLogWhenStore(
    useShallow((s) => ({ dayOffset: s.dayOffset, slot: s.slot, setDay: s.setDay, setSlot: s.setSlot })),
  );
  const [open, setOpen] = useState(false);
  const backdated = !(dayOffset === 0 && slot === 'now');
  const now = new Date();

  return (
    <View
      style={[{
        borderRadius: RADIUS.control, borderWidth: STROKE.control,
        borderColor: backdated ? c.textPrimary : c.divider, overflow: 'hidden',
      }, style]}
    >
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${t('quickLog.whenLabel')}: ${whenLabel(dayOffset, slot, t, language)}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12 }}
      >
        <Ionicons name={backdated ? 'time' : 'time-outline'} size={16} color={c.textPrimary} />
        <Text style={{ flex: 1, fontSize: 13, color: c.textSecondary }}>{t('quickLog.whenLabel')}</Text>
        <Text style={{ fontSize: 14, fontWeight: '800', color: c.textPrimary }}>{whenLabel(dayOffset, slot, t, language)}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={c.textPrimary} />
      </Pressable>

      {open ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 10 }}>
          <Label style={{ fontSize: 10 }}>{t('quickLog.day')}</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
            {Array.from({ length: BACKDATE_DAYS }, (_, i) => (
              <Chip key={i} label={dayLabel(i, t, language)} selected={dayOffset === i} onPress={() => setDay(i)} style={{ paddingHorizontal: 12 }} />
            ))}
          </ScrollView>
          <Label style={{ fontSize: 10 }}>{t('quickLog.meal')}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {dayOffset === 0 ? (
              <Chip label={t('quickLog.now')} selected={slot === 'now'} onPress={() => setSlot('now')} style={{ paddingHorizontal: 12 }} />
            ) : null}
            {SLOTS.map((s) => {
              // Today: a meal that hasn't come yet can't be picked.
              const [h, m] = SLOT_TIME[s];
              const future = dayOffset === 0 && (now.getHours() * 60 + now.getMinutes() < h * 60 + m);
              return (
                <Chip
                  key={s}
                  label={t(`quickLog.${s}`)}
                  selected={slot === s}
                  disabled={future}
                  onPress={() => setSlot(s)}
                  style={{ paddingHorizontal: 12, opacity: future ? 0.35 : 1 }}
                />
              );
            })}
          </View>
          {backdated ? (
            <Text style={{ fontSize: 12, lineHeight: 17, color: c.textSecondary }}>
              {t('quickLog.whenNote', {
                time: slotDate(dayOffset, slot).toLocaleTimeString(language, { hour: 'numeric', minute: '2-digit' }),
              })}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
