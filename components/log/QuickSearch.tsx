import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Image, ActivityIndicator, Pressable, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button, Card, Chip, IconButton, Label, PressScale, STROKE, TextField } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { portionsFor, type Portion } from '@/constants/foodPortions';
import { describeMeal, fetchRecentFoods, searchFoods, type LibraryFood, type RecentFood } from '@/services/api';
import { scaleMicros } from '@/lib/micros';
import type { FoodResult } from '@/components/log/ResultCard';
import { useFoodNames } from '@/hooks/useFoodNames';

export type QuickSource = 'search' | 'text';

interface Props {
  /** A food is ready for the result card. `edit` opens it in edit mode (manual entry). */
  onPick: (result: FoodResult, opts: { source: QuickSource; edit?: boolean }) => void;
  /** AI errors the screen handles (daily limit → paywall alert). */
  onAiError: (error: Error) => void;
  /** "Free: 3 AI scans a day" style note under the AI button; null when unlimited. */
  quotaBadge?: string | null;
  onQuotaPress?: () => void;
  /** Bump after a save so "recent" picks up the new food. */
  refreshKey?: number;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/**
 * 搜索 mode on the Log tab, for meals nobody photographed:
 * recent foods (one tap), the food library with everyday portions,
 * and "describe it in a sentence" through AI.
 */
export default function QuickSearch({ onPick, onAiError, quotaBadge, onQuotaPress, refreshKey = 0 }: Props) {
  const c = useTheme();
  const { t, language } = useTranslation();
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<RecentFood[] | null>(null);
  const [results, setResults] = useState<LibraryFood[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [describing, setDescribing] = useState(false);
  const [picked, setPicked] = useState<LibraryFood | null>(null);
  const latest = useRef('');

  useEffect(() => {
    let alive = true;
    fetchRecentFoods().then((r) => { if (alive) setRecents(r); }).catch(() => { if (alive) setRecents((prev) => prev ?? []); });
    return () => { alive = false; };
  }, [refreshKey]);

  // Library search, debounced; stale answers are dropped.
  useEffect(() => {
    const q = query.trim();
    latest.current = q;
    setSearchError(false);
    if (!q) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(() => {
      searchFoods(q)
        .then((r) => { if (latest.current === q) setResults(r); })
        .catch(() => { if (latest.current === q) { setResults([]); setSearchError(true); } })
        .finally(() => { if (latest.current === q) setSearching(false); });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const q = query.trim();
  const displayName = (f: LibraryFood) => (language.startsWith('zh') ? f.name : f.nameEn || f.name);
  // Recent foods in the app's language; picking one still logs it as it was logged before.
  const recentName = useFoodNames((recents ?? []).slice(0, 30).map((r) => r.food));
  // Matches what was logged or how it reads now ("apple" finds 苹果 · 1 个).
  const matchingRecents = useMemo(() => {
    if (!recents) return [];
    if (!q) return recents.slice(0, 12);
    const lower = q.toLowerCase();
    return recents.filter((r) => r.food.toLowerCase().includes(lower) || recentName(r.food).toLowerCase().includes(lower)).slice(0, 5);
  }, [recents, q, recentName]);

  const pickRecent = (r: RecentFood) => {
    Keyboard.dismiss();
    onPick({
      food: r.food, calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat,
      fiber: r.fiber, sodium: r.sodium, confidence: 1,
      imageUrl: r.reuse_image && r.image_url ? r.image_url : undefined,
    }, { source: 'search' });
  };

  const describe = async () => {
    if (!q || describing) return;
    Keyboard.dismiss();
    setDescribing(true);
    try {
      const r = await describeMeal(q, language);
      onPick({ ...r, confidence: r.confidence }, { source: 'text' });
    } catch (e: any) {
      onAiError(e instanceof Error ? e : new Error(String(e?.message ?? e)));
    } finally {
      setDescribing(false);
    }
  };

  const manual = () => {
    Keyboard.dismiss();
    onPick({ food: q, calories: 0, protein: 0, carbs: 0, fat: 0, confidence: 1 }, { source: 'search', edit: true });
  };

  if (picked) {
    return (
      <PortionPicker
        food={picked}
        name={displayName(picked)}
        onBack={() => setPicked(null)}
        onConfirm={(r) => { setPicked(null); onPick(r, { source: 'search' }); }}
      />
    );
  }

  const sectionTitle = (label: string) => <Label style={{ marginTop: 18, marginBottom: 8 }}>{label}</Label>;

  return (
    <View>
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder={t('quickLog.placeholder')}
        returnKeyType="search"
        autoCorrect={false}
        maxLength={300}
        accessibilityLabel={t('quickLog.placeholder')}
        right={query ? (
          <IconButton icon="close" onPress={() => setQuery('')} accessibilityLabel={t('quickLog.clear')} />
        ) : undefined}
      />

      {/* Recent foods: one tap, no AI */}
      {recents === null ? (
        !q ? <ActivityIndicator style={{ marginTop: 24 }} color={c.textPrimary} /> : null
      ) : matchingRecents.length > 0 ? (
        <>
          {sectionTitle(t('quickLog.recent'))}
          <View style={{ gap: 8 }}>
            {matchingRecents.map((r) => (
              <FoodRow
                key={`r-${r.food}`}
                title={recentName(r.food)}
                detail={`${Math.round(r.calories)} kcal · P ${Math.round(r.protein)}g · C ${Math.round(r.carbs)}g · F ${Math.round(r.fat)}g`}
                badge={r.count > 1 ? t('quickLog.timesN', { n: String(r.count) }) : undefined}
                imageUri={r.image_url ?? undefined}
                icon="time-outline"
                onPress={() => pickRecent(r)}
              />
            ))}
          </View>
        </>
      ) : !q ? (
        <Text style={{ fontSize: 14, lineHeight: 20, color: c.textSecondary, marginTop: 18 }}>{t('quickLog.recentEmpty')}</Text>
      ) : null}

      {/* Library */}
      {q ? (
        <>
          {sectionTitle(t('quickLog.library'))}
          {searching && results.length === 0 ? (
            <ActivityIndicator color={c.textPrimary} style={{ marginVertical: 12 }} />
          ) : results.length > 0 ? (
            <View style={{ gap: 8 }}>
              {results.map((f) => (
                <FoodRow
                  key={`f-${f.id}`}
                  title={displayName(f)}
                  detail={`${t('quickLog.per100')} · ${Math.round(f.calories)} kcal · P ${r1(f.protein)}g`}
                  icon="nutrition-outline"
                  onPress={() => { Keyboard.dismiss(); setPicked(f); }}
                />
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 14, color: c.textSecondary }}>
              {searchError ? t('quickLog.searchFailed') : t('quickLog.noResults', { q })}
            </Text>
          )}
        </>
      ) : null}

      {/* Describe it: AI */}
      {q.length >= 2 ? (
        <Card padding={14} style={{ marginTop: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Ionicons name="sparkles" size={16} color={c.textPrimary} />
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '800', color: c.textPrimary }}>{t('quickLog.aiTitle')}</Text>
          </View>
          <Text style={{ fontSize: 13, lineHeight: 18, color: c.textSecondary, marginBottom: 12 }}>{t('quickLog.aiHint')}</Text>
          <Button
            label={t('quickLog.aiDescribe', { q: q.length > 24 ? `${q.slice(0, 23)}…` : q })}
            icon="sparkles"
            loading={describing}
            onPress={describe}
          />
          {quotaBadge ? (
            <Pressable onPress={onQuotaPress} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 36, marginTop: 4 }}>
              <Ionicons name="flash" size={13} color={c.textSecondary} />
              <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary }}>{quotaBadge}</Text>
            </Pressable>
          ) : null}
        </Card>
      ) : null}

      {q ? (
        <Pressable onPress={manual} accessibilityRole="button" style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, marginTop: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.textSecondary, textDecorationLine: 'underline' }}>{t('quickLog.manual')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function FoodRow({ title, detail, badge, imageUri, icon, onPress }: {
  title: string;
  detail: string;
  badge?: string;
  imageUri?: string;
  icon: string;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <PressScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${detail}`}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, minHeight: 60,
        borderRadius: 16, borderWidth: STROKE.card, borderColor: c.borderPrimary, backgroundColor: c.cardBackground,
      }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 11, overflow: 'hidden', backgroundColor: c.cardBackgroundSecondary, alignItems: 'center', justifyContent: 'center' }}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={{ width: 40, height: 40 }} accessibilityIgnoresInvertColors />
        ) : (
          <Ionicons name={icon as any} size={19} color={c.textPrimary} />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={2} style={{ fontSize: 15, fontWeight: '700', color: c.textPrimary }}>{title}</Text>
        <Text numberOfLines={1} style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary }}>{detail}</Text>
      </View>
      {badge ? <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary }}>{badge}</Text> : null}
      <Ionicons name="add-circle" size={24} color={c.textPrimary} />
    </PressScale>
  );
}

/** "吃了多少？" for a library food: everyday portions, 100 g, or any grams. */
function PortionPicker({ food, name, onBack, onConfirm }: {
  food: LibraryFood;
  name: string;
  onBack: () => void;
  onConfirm: (r: FoodResult) => void;
}) {
  const c = useTheme();
  const { t } = useTranslation();
  const portions = portionsFor(food.nameEn);
  // A known portion first; otherwise grams.
  const [choice, setChoice] = useState<number | 'grams'>(portions.length ? 0 : 'grams');
  const [qty, setQty] = useState(1);
  const [grams, setGrams] = useState('100');

  const unitLabel = (pt: Portion) => t(`quickLog.unit.${pt.unit}`);
  const gramsNum = Math.min(5000, Math.max(0, parseFloat(grams.replace(',', '.')) || 0));
  const totalGrams = choice === 'grams' ? gramsNum : portions[choice].grams * qty;
  const f = totalGrams / 100;
  const values = {
    calories: Math.round(food.calories * f),
    protein: r1(food.protein * f),
    carbs: r1(food.carbs * f),
    fat: r1(food.fat * f),
    ...scaleMicros(food, f),
  };

  const confirm = () => {
    if (totalGrams <= 0) return;
    if (choice === 'grams') {
      onConfirm({ food: `${name} (${Math.round(gramsNum)} g)`, ...values, confidence: 1 });
      return;
    }
    // One portion in the name, the count as "×n" (the same way the list stores servings),
    // so "recent" groups 1 and 2 apples together.
    const base = `${name} · 1 ${unitLabel(portions[choice])}`;
    onConfirm({ food: qty === 1 ? base : `${base} ×${qty}`, ...values, confidence: 1 });
  };

  const step = (delta: number) => setQty((v) => Math.min(20, Math.max(0.5, Math.round((v + delta) * 2) / 2)));

  return (
    <Card variant="hero" padding={16}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <IconButton icon="chevron-back" onPress={onBack} accessibilityLabel={t('quickLog.back')} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={2} style={{ fontSize: 20, fontWeight: '800', letterSpacing: -0.5, color: c.textPrimary }}>{name}</Text>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary, marginTop: 2 }}>
            {t('quickLog.per100')} · {Math.round(food.calories)} kcal
          </Text>
        </View>
      </View>

      <Label style={{ marginTop: 16, marginBottom: 8 }}>{t('quickLog.portionTitle')}</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {portions.map((pt, i) => (
          <Chip
            key={pt.unit}
            label={`1 ${unitLabel(pt)} · ${pt.grams} g`}
            selected={choice === i}
            onPress={() => setChoice(i)}
            style={{ paddingHorizontal: 12 }}
          />
        ))}
        <Chip label={t('quickLog.byGrams')} selected={choice === 'grams'} onPress={() => setChoice('grams')} style={{ paddingHorizontal: 12 }} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 }}>
        {choice === 'grams' ? (
          <TextField
            value={grams}
            onChangeText={setGrams}
            keyboardType="decimal-pad"
            selectTextOnFocus
            maxLength={5}
            accessibilityLabel={t('quickLog.byGrams')}
            containerStyle={{ flex: 1 }}
            right={<Text style={{ fontFamily: FONTS.mono, fontSize: 14, color: c.textSecondary, paddingRight: 10 }}>g</Text>}
          />
        ) : (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconButton icon="remove" onPress={() => step(qty <= 1 ? -0.5 : -1)} accessibilityLabel={t('log.lessServing')} />
            <Text style={{ fontFamily: FONTS.mono, fontSize: 20, fontWeight: '700', minWidth: 48, textAlign: 'center', color: c.textPrimary }}>×{qty}</Text>
            <IconButton icon="add" onPress={() => step(qty < 1 ? 0.5 : 1)} accessibilityLabel={t('log.moreServing')} />
          </View>
        )}
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 36, fontWeight: '800', letterSpacing: -1.4, lineHeight: 38, color: c.textPrimary }}>{values.calories}</Text>
          <Label style={{ fontSize: 10 }}>KCAL · {Math.round(totalGrams)} g</Label>
        </View>
      </View>
      <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.textSecondary, marginTop: 10 }}>
        P {values.protein}g · C {values.carbs}g · F {values.fat}g
      </Text>

      <Button label={t('quickLog.confirm')} icon="checkmark" disabled={totalGrams <= 0} onPress={confirm} style={{ marginTop: 16 }} />
    </Card>
  );
}
