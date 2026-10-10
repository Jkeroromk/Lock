import { View, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Text, TextInput } from '@/components/ui/Text';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { Card, Chip, HardShadow, RADIUS } from '@/components/ui/bxc';
import {
  QUICK_ADD_ML, MAX_SINGLE_ADD_ML, MIN_WATER_GOAL_ML, MAX_WATER_GOAL_ML,
} from '@/services/waterTracker';

const CELLS = 8;

interface WaterCardProps {
  waterMl: number;
  goalMl: number;
  canUndo: boolean;
  onAdd: (ml: number) => void;
  onUndo: () => void;
  onSetGoal: (ml: number) => void;
}

type Editing = null | 'custom' | 'goal';

export default function WaterCard({ waterMl, goalMl, canUndo, onAdd, onUndo, onSetGoal }: WaterCardProps) {
  const c = useTheme();
  const { t } = useTranslation();
  const [editing, setEditing] = useState<Editing>(null);
  const isLight = c.backgroundPrimary !== c.ink;
  const filledCells = goalMl > 0 ? Math.min(CELLS, Math.floor((waterMl / goalMl) * CELLS + 1e-6)) : 0;
  const isComplete = waterMl >= goalMl;

  return (
    <Card padding={16} style={{ marginBottom: 14 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => setEditing('goal')}
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

      {/* Cells */}
      <View style={{ flexDirection: 'row', gap: 5, marginTop: 2 }} accessibilityLabel={`${waterMl} of ${goalMl} ml`}>
        {Array.from({ length: CELLS }).map((_, i) => {
          const filled = i < filledCells;
          return (
            <View
              key={i}
              style={{
                flex: 1, height: 24, borderRadius: RADIUS.cell,
                backgroundColor: filled ? c.accent : 'transparent',
                borderWidth: 1.5,
                borderColor: isLight ? c.ink : filled ? c.accent : c.borderSecondary,
              }}
            />
          );
        })}
      </View>

      {isComplete ? (
        <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textPrimary, marginTop: 8 }}>{t('water.achieved')}</Text>
      ) : null}

      {/* Quick add */}
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
        {QUICK_ADD_ML.map((ml) => (
          <Chip key={ml} label={`+${ml}`} selected={ml === 250} onPress={() => onAdd(ml)} style={{ flex: 1, paddingHorizontal: 0 }} />
        ))}
        <TouchableOpacity
          onPress={() => setEditing('custom')}
          accessibilityRole="button"
          accessibilityLabel={t('water.custom')}
          style={{
            width: 44, height: 44, borderRadius: RADIUS.control, borderWidth: 2, borderColor: c.borderPrimary,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name="add" size={20} color={c.textPrimary} />
        </TouchableOpacity>
      </View>

      <AmountModal
        visible={editing !== null}
        title={editing === 'goal' ? t('water.goalTitle') : t('water.customTitle')}
        initial={editing === 'goal' ? goalMl : undefined}
        min={editing === 'goal' ? MIN_WATER_GOAL_ML : 1}
        max={editing === 'goal' ? MAX_WATER_GOAL_ML : MAX_SINGLE_ADD_ML}
        onCancel={() => setEditing(null)}
        onSubmit={(ml) => {
          if (editing === 'goal') onSetGoal(ml);
          else onAdd(ml);
          setEditing(null);
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
  const { t } = useTranslation();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (visible) setValue(initial ? String(initial) : '');
  }, [visible, initial]);

  const parsed = Number(value);
  const valid = Number.isFinite(parsed) && parsed >= min && parsed <= max;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
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
