import { View, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Pressable, useWindowDimensions } from 'react-native';
import { Text, TextInput } from '@/components/ui/Text';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { Card, Chip, HardShadow, PressScale, RADIUS, Sticker } from '@/components/ui/bxc';
import {
  QUICK_ADD_ML, MIN_WATER_GOAL_ML, MAX_WATER_GOAL_ML,
} from '@/services/waterTracker';
import { drinkOf, type DrinkKind } from '@/constants/drinks';
import WaterBottle from '@/components/today/WaterBottle';
import DrinkSheet from '@/components/today/DrinkSheet';
import DrinkWheel from '@/components/today/DrinkWheel';
import { useSheetSides } from '@/hooks/useSheetSides';

interface WaterCardProps {
  waterMl: number;
  goalMl: number;
  /** Each addition today (ml counted as water) and its drink, oldest first. */
  log: number[];
  kinds: string[];
  canUndo: boolean;
  onAdd: (ml: number) => void;
  onAddDrink: (kind: DrinkKind, ml: number) => void;
  onUndo: () => void;
  onSetGoal: (ml: number) => void;
}

/**
 * Hydration: a bottle that fills up with the buddy floating on top (tilt the
 * phone and the water sloshes), today's drinks beside it, one-tap glasses of
 * water and "+" for any other drink.
 */
export default function WaterCard({ waterMl, goalMl, log, kinds, canUndo, onAdd, onAddDrink, onUndo, onSetGoal }: WaterCardProps) {
  const c = useTheme();
  const { t } = useTranslation();
  const { width: screenW } = useWindowDimensions();
  const [editingGoal, setEditingGoal] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [sheetKind, setSheetKind] = useState<DrinkKind>('water');
  const [wheel, setWheel] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const plusRef = useRef<ComponentRef<typeof View>>(null);
  // Each drink added → the buddy hops and the water splashes.
  const [splash, setSplash] = useState(0);
  const openWheel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    plusRef.current?.measureInWindow((x: number, y: number, w: number, h: number) => {
      setAnchor({ x: x + w / 2, y: y + h / 2 });
      setWheel(true);
    });
  };
  const isComplete = goalMl > 0 && waterMl >= goalMl;
  const left = Math.max(0, goalMl - waterMl);

  // Goal reached just now (not on first load) → the buddy cheers.
  const [celebrate, setCelebrate] = useState(0);
  const wasComplete = useRef<boolean | null>(null);
  useEffect(() => {
    if (wasComplete.current === false && isComplete) {
      setCelebrate((n) => n + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    wasComplete.current = isComplete;
  }, [isComplete]);

  const glug = () => {
    setSplash((n) => n + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  // Today's drinks, grouped: "Water ×3 · 750".
  const groups: { kind: string; n: number; ml: number }[] = [];
  log.forEach((ml, i) => {
    const kind = drinkOf(kinds[i]).kind;
    const g = groups.find((x) => x.kind === kind);
    if (g) { g.n += 1; g.ml += ml; } else groups.push({ kind, n: 1, ml });
  });
  groups.sort((a, b) => b.ml - a.ml);

  const bottleW = Math.min(170, Math.max(130, Math.round(screenW * 0.38)));

  return (
    <Card padding={16} style={{ marginBottom: 14 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => setEditingGoal(true)}
          accessibilityRole="button"
          accessibilityLabel={t('water.goalTitle')}
          style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, minHeight: 44 }}
        >
          <Text style={{ fontSize: 20, fontWeight: '800', color: c.textPrimary }}>{t('water.title')}</Text>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: isComplete ? c.textPrimary : c.textSecondary }}>
            {waterMl.toLocaleString()} / {goalMl.toLocaleString()} {t('water.ml')}
          </Text>
          <Ionicons name="pencil" size={11} color={c.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onUndo}
          disabled={!canUndo}
          accessibilityRole="button"
          accessibilityLabel={t('water.undo')}
          style={{ width: 44, height: 44, marginRight: -10, alignItems: 'center', justifyContent: 'center', opacity: canUndo ? 1 : 0.3 }}
        >
          <Ionicons name="arrow-undo" size={19} color={c.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Bottle + today's drinks */}
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }} accessibilityLabel={`${waterMl} of ${goalMl} ml`}>
        <View>
          <WaterBottle level={goalMl > 0 ? waterMl / goalMl : 0} width={bottleW} height={Math.round(bottleW * 1.45)} celebrate={celebrate} splash={splash} />
          {isComplete ? (
            <Sticker style={{ position: 'absolute', top: 34, alignSelf: 'center' }} rotate={-5}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: c.onAccent }}>{t('water.goalDone')}</Text>
            </Sticker>
          ) : null}
        </View>
        <View style={{ flex: 1, justifyContent: 'center', gap: 4 }}>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary }}>{t('water.todayDrank')}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 42, fontWeight: '800', letterSpacing: -1.5, lineHeight: 46, color: c.textPrimary }}>
            {waterMl.toLocaleString()}
          </Text>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.textSecondary }}>
            {t('water.ml')} · {isComplete ? t('water.full') : t('water.left', { ml: left.toLocaleString() })}
          </Text>
          <View style={{ marginTop: 10, gap: 5 }}>
            {groups.length === 0 ? (
              <Text style={{ fontSize: 13, color: c.textTertiary }}>{t('water.nothingYet')}</Text>
            ) : groups.slice(0, 4).map((g) => (
              <View key={g.kind} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name={drinkOf(g.kind).icon as any} size={13} color={c.textPrimary} />
                <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONTS.mono, fontSize: 12, color: c.textPrimary }}>
                  {t(`water.drinks.${g.kind}` as any)} ×{g.n} · {g.ml}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Quick add: water; "+" for any drink */}
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
        {QUICK_ADD_ML.map((ml) => (
          <Chip key={ml} label={`+${ml}`} onPress={() => { glug(); onAdd(ml); }} style={{ flex: 1, paddingHorizontal: 0 }} />
        ))}
        <View ref={plusRef} collapsable={false}>
        <PressScale
          onPress={openWheel}
          accessibilityRole="button"
          accessibilityLabel={t('water.pickDrink')}
          style={{
            width: 52, height: 44, borderRadius: RADIUS.control, borderWidth: 2, borderColor: c.ink, backgroundColor: c.accent,
            alignItems: 'center', justifyContent: 'center', shadowColor: c.ink, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 3, height: 3 },
          }}
        >
          <Ionicons name="add" size={22} color={c.onAccent} />
        </PressScale>
        </View>
      </View>

      <DrinkWheel
        visible={wheel}
        anchor={anchor}
        onClose={() => setWheel(false)}
        onAdd={(kind, ml) => { glug(); onAddDrink(kind, ml); }}
        // After the wheel's modal has gone (iOS won't present one while another is closing).
        onCustom={(kind) => { setSheetKind(kind); setTimeout(() => setSheet(true), 350); }}
      />
      <DrinkSheet visible={sheet} initialKind={sheetKind} onClose={() => setSheet(false)} onAdd={(kind, ml) => { glug(); onAddDrink(kind, ml); }} />

      <AmountModal
        visible={editingGoal}
        title={t('water.goalTitle')}
        initial={goalMl}
        min={MIN_WATER_GOAL_ML}
        max={MAX_WATER_GOAL_ML}
        onCancel={() => setEditingGoal(false)}
        onSubmit={(ml) => {
          onSetGoal(ml);
          setEditingGoal(false);
        }}
      />
    </Card>
  );
}

function AmountModal({ visible, title, initial, min, max, onCancel, onSubmit }: {
  visible: boolean;
  title: string;
  initial?: number;
  min: number;
  max: number;
  onCancel: () => void;
  onSubmit: (ml: number) => void;
}) {
  const c = useTheme();
  const sides = useSheetSides();
  const { t } = useTranslation();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (visible) setValue(initial ? String(initial) : '');
  }, [visible, initial]);

  const parsed = Number(value);
  const valid = Number.isFinite(parsed) && parsed >= min && parsed <= max;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, ...sides }}>
        <Pressable onPress={onCancel} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 28 }}>
          <Pressable onPress={() => {}}>
            <HardShadow color={c.cardShadow} radius={RADIUS.hero}>
              <View style={{
                backgroundColor: c.cardBackground, borderRadius: RADIUS.hero, padding: 22,
                borderWidth: 2, borderColor: c.borderStrong,
              }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: c.textPrimary, marginBottom: 14 }}>
                  {title}
                </Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  borderRadius: RADIUS.control, borderWidth: 2, borderColor: c.textPrimary, paddingHorizontal: 14,
                }}>
                  <TextInput
                    value={value}
                    onChangeText={(v) => setValue(v.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    autoFocus
                    maxLength={4}
                    placeholder={String(min === 1 ? 300 : 2000)}
                    placeholderTextColor={c.textTertiary}
                    style={{ flex: 1, paddingVertical: 12, fontSize: 24, fontWeight: '800', color: c.textPrimary }}
                    onSubmitEditing={() => valid && onSubmit(parsed)}
                  />
                  <Text style={{ fontFamily: FONTS.mono, fontSize: 13, color: c.textSecondary }}>{t('water.ml')}</Text>
                </View>
                <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary, marginTop: 8 }}>
                  {t('water.range').replace('{min}', String(min)).replace('{max}', String(max))}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                  <Chip label={t('common.cancel')} onPress={onCancel} style={{ flex: 1 }} />
                  <TouchableOpacity
                    onPress={() => valid && onSubmit(parsed)}
                    disabled={!valid}
                    accessibilityRole="button"
                    style={{
                      flex: 1, minHeight: 44, borderRadius: RADIUS.control, borderWidth: 2, borderColor: c.ink,
                      backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', opacity: valid ? 1 : 0.4,
                    }}
                  >
                    <Text style={{ fontFamily: FONTS.mono, fontWeight: '600', fontSize: 13, color: c.onAccent }}>{t('common.save')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </HardShadow>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
