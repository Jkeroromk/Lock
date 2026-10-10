import { View, Text, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import {
  QUICK_ADD_ML, MAX_SINGLE_ADD_ML, MIN_WATER_GOAL_ML, MAX_WATER_GOAL_ML,
} from '@/services/waterTracker';

const BLUE = '#3B82F6';

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
  const colors = useTheme();
  const { t } = useTranslation();
  const percent = goalMl > 0 ? Math.min(waterMl / goalMl, 1) : 0;
  const isComplete = waterMl >= goalMl;
  const [editing, setEditing] = useState<Editing>(null);

  const fillWidth = useSharedValue(0);
  useEffect(() => {
    fillWidth.value = withSpring(percent, { damping: 18, stiffness: 120 });
  }, [percent]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fillWidth.value * 100}%` }));

  const chip = (label: string, onPress: () => void, primary = false, icon?: keyof typeof Ionicons.glyphMap) => (
    <TouchableOpacity
      key={label}
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flex: 1,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
        paddingVertical: 8, borderRadius: 11,
        backgroundColor: primary ? BLUE : colors.cardBackgroundSecondary,
        borderWidth: primary ? 0 : 1, borderColor: colors.borderPrimary,
      }}
    >
      {icon ? <Ionicons name={icon} size={13} color={primary ? '#fff' : colors.textPrimary} /> : null}
      <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '800', color: primary ? '#fff' : colors.textPrimary }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{
      borderRadius: 20,
      backgroundColor: colors.cardBackground,
      borderWidth: 1, borderColor: colors.borderPrimary,
      padding: DIMENSIONS.SPACING * 1.1,
      marginBottom: DIMENSIONS.SPACING,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING * 0.9 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="water" size={18} color={BLUE} />
          <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>
            {t('water.title')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onUndo}
          disabled={!canUndo}
          accessibilityLabel={t('water.undo')}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            paddingHorizontal: 10, height: 30, borderRadius: 9,
            backgroundColor: colors.cardBackgroundSecondary,
            borderWidth: 1, borderColor: colors.borderPrimary,
            opacity: canUndo ? 1 : 0.35,
          }}
        >
          <Ionicons name="arrow-undo" size={13} color={colors.textPrimary} />
          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textPrimary }}>{t('water.undo')}</Text>
        </TouchableOpacity>
      </View>

      {/* Amount + progress */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: DIMENSIONS.SPACING }}>
        <TouchableOpacity onPress={() => setEditing('goal')} activeOpacity={0.7} style={{ alignItems: 'center', minWidth: 64 }}>
          <Text style={{ fontSize: TYPOGRAPHY.numberL * 0.75, fontWeight: '900', color: isComplete ? BLUE : colors.textPrimary, lineHeight: TYPOGRAPHY.numberL * 0.8 }}>
            {waterMl}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary }}>
              / {goalMl} {t('water.ml')}
            </Text>
            <Ionicons name="pencil" size={10} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <View style={{ flex: 1, gap: DIMENSIONS.SPACING * 0.5 }}>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.borderPrimary, overflow: 'hidden' }}>
            <Animated.View style={[{ height: '100%', borderRadius: 4, backgroundColor: BLUE }, fillStyle]} />
          </View>
          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: isComplete ? BLUE : colors.textSecondary }}>
            {isComplete
              ? t('water.achieved')
              : t('water.remaining').replace('{ml}', String(Math.max(goalMl - waterMl, 0)))}
          </Text>
        </View>
      </View>

      {/* Quick add */}
      <View style={{ flexDirection: 'row', gap: 6, marginTop: DIMENSIONS.SPACING }}>
        {QUICK_ADD_ML.map((ml) => chip(`+${ml}`, () => onAdd(ml), ml === 250))}
        {chip(t('water.custom'), () => setEditing('custom'), false, 'create-outline')}
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
    </View>
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
  const colors = useTheme();
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
        <Pressable onPress={onCancel} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 28 }}>
          <Pressable onPress={() => {}} style={{
            backgroundColor: colors.cardBackground, borderRadius: 22, padding: 22,
            borderWidth: 1, borderColor: colors.borderPrimary,
          }}>
            <Text style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: colors.textPrimary, marginBottom: 14 }}>
              {title}
            </Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.cardBackgroundSecondary, borderRadius: 14,
              borderWidth: 1, borderColor: colors.borderPrimary, paddingHorizontal: 14,
            }}>
              <TextInput
                value={value}
                onChangeText={(v) => setValue(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                autoFocus
                maxLength={4}
                placeholder={String(min === 1 ? 300 : 2000)}
                placeholderTextColor={colors.textSecondary}
                style={{ flex: 1, paddingVertical: 12, fontSize: TYPOGRAPHY.bodyL, fontWeight: '800', color: colors.textPrimary }}
                onSubmitEditing={() => valid && onSubmit(parsed)}
              />
              <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.textSecondary }}>{t('water.ml')}</Text>
            </View>
            <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary, marginTop: 8 }}>
              {t('water.range').replace('{min}', String(min)).replace('{max}', String(max))}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <TouchableOpacity onPress={onCancel} style={{
                flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 13,
                borderWidth: 1, borderColor: colors.borderPrimary,
              }}>
                <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '800', color: colors.textPrimary }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => valid && onSubmit(parsed)} disabled={!valid} style={{
                flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 13,
                backgroundColor: BLUE, opacity: valid ? 1 : 0.4,
              }}>
                <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '800', color: '#fff' }}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
