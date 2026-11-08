import { View, ScrollView, TouchableOpacity, Alert, Platform, Share } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { languageNames, type LanguageCode } from '@/i18n/locales';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { Button, Card, Chip, Label } from '@/components/ui/bxc';
import { fetchMealsForExport, fetchWeightRecords } from '@/services/api';
import { useStore } from '@/store/useStore';
import { useTabBarInset } from '@/hooks/useTabBarInset';
import DateRangeCalendar, { dayKey, keyDate } from '@/components/settings/DateRangeCalendar';

type RangeKey = '7' | '30' | '90' | 'all' | 'custom';
type ExportLang = LanguageCode | 'original';

const RANGES: RangeKey[] = ['7', '30', '90', 'all', 'custom'];
const LANGS: LanguageCode[] = ['zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ko-KR'];

/** Column headers in the export's language (not necessarily the app's). */
const HEADERS: Record<LanguageCode, {
  date: string; time: string; food: string; kcal: string; protein: string; carbs: string; fat: string; weight: string; note: string;
}> = {
  'zh-CN': { date: '日期', time: '时间', food: '食物', kcal: '热量 (kcal)', protein: '蛋白质 (g)', carbs: '碳水 (g)', fat: '脂肪 (g)', weight: '体重', note: '备注' },
  'zh-TW': { date: '日期', time: '時間', food: '食物', kcal: '熱量 (kcal)', protein: '蛋白質 (g)', carbs: '碳水 (g)', fat: '脂肪 (g)', weight: '體重', note: '備註' },
  'en-US': { date: 'Date', time: 'Time', food: 'Food', kcal: 'Calories (kcal)', protein: 'Protein (g)', carbs: 'Carbs (g)', fat: 'Fat (g)', weight: 'Weight', note: 'Note' },
  'ja-JP': { date: '日付', time: '時刻', food: '食品', kcal: 'カロリー (kcal)', protein: 'たんぱく質 (g)', carbs: '炭水化物 (g)', fat: '脂質 (g)', weight: '体重', note: 'メモ' },
  'ko-KR': { date: '날짜', time: '시간', food: '음식', kcal: '칼로리 (kcal)', protein: '단백질 (g)', carbs: '탄수화물 (g)', fat: '지방 (g)', weight: '체중', note: '메모' },
};

const csvCell = (v: string | number) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvLine = (cells: (string | number)[]) => cells.map(csvCell).join(',');
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

async function shareFile(filename: string, content: string, title: string) {
  const uri = (FileSystem.cacheDirectory ?? '') + filename;
  // BOM: Excel otherwise opens UTF-8 CSV as Latin-1 and garbles Chinese / Japanese / Korean.
  await FileSystem.writeAsStringAsync(uri, '﻿' + content, { encoding: FileSystem.EncodingType.UTF8 });
  if (Platform.OS === 'ios') {
    await Share.share({ url: uri, title });
  } else {
    await Share.share({ message: content, title });
  }
}

export default function ExportDataScreen() {
  const tabInset = useTabBarInset();
  const router = useRouter();
  const colors = useTheme();
  const { t, language } = useTranslation();
  const weightUnit = useStore((s) => s.weightUnit);
  const [range, setRange] = useState<RangeKey>('30');
  const [customFrom, setCustomFrom] = useState(() => dayKey(new Date(Date.now() - 6 * 86_400_000)));
  const [customTo, setCustomTo] = useState(() => dayKey(new Date()));
  const [lang, setLang] = useState<ExportLang>(language as LanguageCode);
  const [exportingMeals, setExportingMeals] = useState(false);
  const [exportingWeight, setExportingWeight] = useState(false);

  // Headers follow the chosen language; "as logged" uses the app's.
  const headers = HEADERS[lang === 'original' ? (language as LanguageCode) : lang] ?? HEADERS['en-US'];

  /** [from, to] as local YYYY-MM-DD, or nulls for everything. */
  const bounds = (): [string | null, string | null] => {
    if (range === 'all') return [null, null];
    if (range === 'custom') return [customFrom, customTo];
    const n = Number(range);
    return [dayKey(new Date(Date.now() - (n - 1) * 86_400_000)), dayKey(new Date())];
  };
  const fileSuffix = () => {
    const [from, to] = bounds();
    return from && to ? `_${from}_${to}` : '';
  };
  const rangeText = () => {
    const [from, to] = bounds();
    if (!from || !to) return t('exportData.rangeAll');
    const fmt = (k: string) => {
      try { return keyDate(k).toLocaleDateString(language, { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return k; }
    };
    return from === to ? fmt(from) : `${fmt(from)} – ${fmt(to)}`;
  };

  const handleExportMeals = async () => {
    setExportingMeals(true);
    try {
      const [from, to] = bounds();
      const res = await fetchMealsForExport({
        from: from ?? undefined,
        to: to ?? undefined,
        lang: lang === 'original' ? undefined : lang,
      });
      if (!res.meals.length) {
        Alert.alert(t('common.error'), t('exportData.noMealsInRange'));
        return;
      }
      const lines = [
        csvLine([headers.date, headers.time, headers.food, headers.kcal, headers.protein, headers.carbs, headers.fat]),
        ...res.meals.map((m) => {
          const d = new Date(m.created_at);
          return csvLine([dayKey(d), hhmm(d), m.food_name ?? '', m.calories, m.protein, m.carbs, m.fat]);
        }),
      ];
      await shareFile(`lock_meals${fileSuffix()}.csv`, lines.join('\n'), t('exportData.shareTitle'));
      if (res.translated && !res.complete) Alert.alert(t('exportData.success'), t('exportData.partlyTranslated'));
    } catch {
      Alert.alert(t('common.error'), t('exportData.fetchFailed'));
    } finally {
      setExportingMeals(false);
    }
  };

  const handleExportWeight = async () => {
    setExportingWeight(true);
    try {
      const [from, to] = bounds();
      const records = (await fetchWeightRecords()).filter((r) => {
        const k = dayKey(new Date(r.recordedAt));
        return (!from || k >= from) && (!to || k <= to);
      });
      if (!records.length) {
        Alert.alert(t('common.error'), t('exportData.noWeightInRange'));
        return;
      }
      const lb = weightUnit === 'lb';
      const lines = [
        csvLine([headers.date, headers.time, `${headers.weight} (${lb ? 'lb' : 'kg'})`, headers.note]),
        ...records.map((r) => {
          const d = new Date(r.recordedAt);
          const w = lb ? Math.round(r.weight * 2.20462 * 10) / 10 : r.weight;
          return csvLine([dayKey(d), hhmm(d), w, r.note ?? '']);
        }),
      ];
      await shareFile(`lock_weight${fileSuffix()}.csv`, lines.join('\n'), t('exportData.shareTitle'));
    } catch {
      Alert.alert(t('common.error'), t('exportData.fetchFailed'));
    } finally {
      setExportingWeight(false);
    }
  };

  const rangeLabel = (r: RangeKey) =>
    r === 'all' ? t('exportData.rangeAll') : r === 'custom' ? t('exportData.rangeCustom') : t('exportData.rangeDays', { n: r });

  const cards = [
    {
      icon: 'restaurant-outline' as const,
      title: t('exportData.meals'),
      description: t('exportData.mealsDescription'),
      buttonLabel: t('exportData.exportMeals'),
      loading: exportingMeals,
      loadingLabel: lang !== 'original' ? t('exportData.translating') : t('exportData.exporting'),
      onPress: handleExportMeals,
    },
    {
      icon: 'scale-outline' as const,
      title: t('exportData.weight'),
      description: t('exportData.weightDescription'),
      buttonLabel: t('exportData.exportWeight'),
      loading: exportingWeight,
      loadingLabel: t('exportData.exporting'),
      onPress: handleExportWeight,
    },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingVertical: DIMENSIONS.SPACING }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: DIMENSIONS.SPACING }} accessibilityRole="button" accessibilityLabel={t('common.back' as any)}>
          <Ionicons name="chevron-back" size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: colors.textPrimary }}>{t('exportData.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingBottom: tabInset }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: TYPOGRAPHY.bodyS, color: colors.textSecondary, marginBottom: 16, lineHeight: TYPOGRAPHY.bodyS * 1.6 }}>
          {t('exportData.description')}
        </Text>

        {/* Date range */}
        <Card padding={14} style={{ marginBottom: 12 }}>
          <Label style={{ marginBottom: 10 }}>{t('exportData.range')}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {RANGES.map((r) => (
              <Chip key={r} label={rangeLabel(r)} selected={range === r} onPress={() => setRange(r)} style={{ paddingHorizontal: 12 }} />
            ))}
          </View>
          {range === 'custom' ? (
            <View style={{ marginTop: 12 }}>
              <DateRangeCalendar from={customFrom} to={customTo} onChange={(f, to) => { setCustomFrom(f); setCustomTo(to); }} />
            </View>
          ) : null}
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginTop: 12 }}>{rangeText()}</Text>
        </Card>

        {/* Language */}
        <Card padding={14} style={{ marginBottom: 16 }}>
          <Label style={{ marginBottom: 10 }}>{t('exportData.language')}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {LANGS.map((l) => (
              <Chip key={l} label={languageNames[l]} selected={lang === l} onPress={() => setLang(l)} style={{ paddingHorizontal: 12 }} />
            ))}
            <Chip label={t('exportData.langOriginal')} selected={lang === 'original'} onPress={() => setLang('original')} style={{ paddingHorizontal: 12 }} />
          </View>
          <Text style={{ fontSize: 12, lineHeight: 17, color: colors.textSecondary, marginTop: 10 }}>
            {lang === 'original' ? t('exportData.langOriginalNote') : t('exportData.langNote')}
          </Text>
        </Card>

        {cards.map((card) => (
          <Card key={card.title} padding={DIMENSIONS.CARD_PADDING} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name={card.icon} size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
              <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary, marginLeft: 8 }}>{card.title}</Text>
            </View>
            <Text style={{ fontSize: TYPOGRAPHY.bodyXS, color: colors.textSecondary, marginBottom: 12, lineHeight: TYPOGRAPHY.bodyXS * 1.6 }}>
              {card.description}
            </Text>
            <Button
              label={card.loading ? card.loadingLabel : card.buttonLabel}
              icon="share-outline"
              loading={card.loading}
              disabled={card.loading}
              onPress={card.onPress}
            />
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
