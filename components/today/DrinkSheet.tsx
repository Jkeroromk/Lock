import { useEffect, useState } from 'react';
import { View, Modal, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDeviceLayout } from '@/hooks/useDeviceLayout';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '@/components/ui/Text';
import { PressScale } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { DRINKS, drinkAmounts, type DrinkKind } from '@/constants/drinks';
import { QUICK_ADD_ML, MAX_SINGLE_ADD_ML } from '@/services/waterTracker';

/**
 * "Add a drink": pick what you drank and how much. Shows how much counts as
 * water and, for drinks with calories, what gets added to today's food.
 */
export default function DrinkSheet({ visible, onClose, onAdd }: {
  visible: boolean;
  onClose: () => void;
  onAdd: (kind: DrinkKind, ml: number) => void;
}) {
  const c = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { fold } = useDeviceLayout();
  const [kind, setKind] = useState<DrinkKind>('water');
  const [size, setSize] = useState<number>(250);
  const [custom, setCustom] = useState('');

  useEffect(() => {
    if (visible) { setKind('water'); setSize(250); setCustom(''); }
  }, [visible]);

  const ml = custom ? Math.min(MAX_SINGLE_ADD_ML, Number(custom) || 0) : size;
  const drink = DRINKS.find((d) => d.kind === kind)!;
  const amounts = drinkAmounts(drink, ml);
  const name = (k: DrinkKind) => t(`water.drinks.${k}` as any);

  return (
    <Modal visible={visible} transparent animationType={fold ? 'fade' : 'slide'} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Dim the whole screen; tap outside to close. */}
        <Pressable onPress={onClose} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} accessibilityLabel={t('common.close')} />
        {/* Open iPhone Duo: the sheet fills one half and never crosses the fold
            (right page side by side, bottom half turned a quarter). Phones: a
            bottom sheet. */}
        <View style={[
          { backgroundColor: c.backgroundPrimary, paddingTop: 10, paddingHorizontal: 20 },
          fold?.axis === 'vertical'
            ? { position: 'absolute', left: fold.start + fold.width, right: 0, top: 0, bottom: 0, borderTopLeftRadius: 30, borderBottomLeftRadius: 30, paddingTop: insets.top + 18, paddingRight: insets.right + 16, paddingBottom: insets.bottom + 16 }
            : fold?.axis === 'horizontal'
              ? { position: 'absolute', left: 0, right: 0, top: fold.start + fold.width, bottom: 0, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingLeft: insets.left + 20, paddingRight: insets.right + 20, paddingBottom: insets.bottom + 16 }
              : { marginTop: 'auto', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: insets.bottom + 18, maxHeight: '88%', alignSelf: 'center', width: '100%', maxWidth: 520 },
        ]}>
          {fold ? null : <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.borderSecondary, marginBottom: 10 }} />}
          <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: c.textPrimary }}>{t('water.drinkSheetTitle')}</Text>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary }}>{t('water.factorHint')}</Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DRINKS.map((d) => {
                const on = d.kind === kind;
                const kcal = drinkAmounts(d, ml).kcal;
                return (
                  <PressScale
                    key={d.kind}
                    onPress={() => setKind(d.kind)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={{
                      width: '31.5%', height: 88, borderRadius: 18, borderWidth: 2, borderColor: c.ink,
                      backgroundColor: on ? c.accent : c.cardBackground, alignItems: 'center', justifyContent: 'center', gap: 3,
                      shadowColor: c.ink, shadowOpacity: on ? 1 : 0, shadowRadius: 0, shadowOffset: { width: 3, height: 3 },
                    }}
                  >
                    <Ionicons name={d.icon as any} size={22} color={on ? c.onAccent : c.textPrimary} />
                    <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '800', color: on ? c.onAccent : c.textPrimary }}>{name(d.kind)}</Text>
                    <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: on ? c.onAccent : c.textSecondary }}>
                      {Math.round(d.factor * 100)}%{kcal > 0 ? ` · ${kcal} kcal` : ''}
                    </Text>
                  </PressScale>
                );
              })}
            </View>

            <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary }}>{t('water.size')}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {QUICK_ADD_ML.map((n) => {
                const on = !custom && size === n;
                return (
                  <PressScale key={n} onPress={() => { setSize(n); setCustom(''); }} accessibilityRole="radio" accessibilityState={{ selected: on }}
                    style={{ flex: 1, height: 44, borderRadius: 14, borderWidth: 2, borderColor: c.ink, backgroundColor: on ? c.surfaceInverse : c.cardBackground, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: FONTS.mono, fontSize: 13, fontWeight: '600', color: on ? c.textInverse : c.textPrimary }}>{n}</Text>
                  </PressScale>
                );
              })}
              <TextInput
                value={custom}
                onChangeText={(v) => setCustom(v.replace(/[^0-9]/g, '').slice(0, 4))}
                keyboardType="number-pad"
                placeholder={t('water.custom')}
                placeholderTextColor={c.textTertiary}
                accessibilityLabel={t('water.customTitle')}
                style={{
                  flex: 1.2, height: 44, borderRadius: 14, borderWidth: 2, borderStyle: custom ? 'solid' : 'dashed', borderColor: c.ink,
                  textAlign: 'center', fontFamily: FONTS.mono, fontSize: 13, fontWeight: '600', color: c.textPrimary, paddingVertical: 0,
                  backgroundColor: custom ? c.cardBackground : 'transparent',
                }}
              />
            </View>

            <View style={{ borderRadius: 18, borderWidth: 2, borderColor: c.ink, backgroundColor: c.cardBackground, padding: 14, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.textPrimary }}>{t('water.countsAs')}</Text>
                <Text style={{ fontFamily: FONTS.mono, fontSize: 14, fontWeight: '600', color: c.textPrimary }}>+{amounts.waterMl} ml</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.textPrimary }}>{t('water.kcal')}</Text>
                <Text style={{ fontFamily: FONTS.mono, fontSize: 14, fontWeight: '600', color: c.textPrimary }}>
                  {amounts.kcal > 0 ? `+${amounts.kcal} kcal${amounts.protein >= 1 ? ` · P ${Math.round(amounts.protein)}g` : ''}` : '0'}
                </Text>
              </View>
              {amounts.kcal > 0 ? (
                <Text style={{ fontSize: 12, lineHeight: 17, color: c.textSecondary }}>{t('water.kcalNote', { drink: name(kind) })}</Text>
              ) : null}
            </View>

          </ScrollView>
            <PressScale
              onPress={() => { if (ml > 0) { onAdd(kind, ml); onClose(); } }}
              disabled={ml <= 0}
              accessibilityRole="button"
              style={{
                height: 58, borderRadius: 29, borderWidth: 2, borderColor: c.ink, backgroundColor: c.accent, opacity: ml > 0 ? 1 : 0.4,
                alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
                shadowColor: c.ink, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 },
              }}
            >
              <Ionicons name="water" size={20} color={c.onAccent} />
              <Text style={{ fontSize: 18, fontWeight: '800', color: c.onAccent }}>{t('water.addCta', { ml: String(ml), drink: name(kind) })}</Text>
            </PressScale>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
