import { useState } from 'react';
import { View, Modal, ScrollView, Image, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button, IconButton, Label, PressScale, STROKE } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { useMealCartStore, cartTotals, type CartItem } from '@/store/useMealCartStore';

const SOURCE_ICON: Record<CartItem['source'], string> = {
  photo: 'camera-outline',
  label: 'document-text-outline',
  barcode: 'barcode-outline',
};

/** Ink strip under the mode switch: "3 items · 540 kcal" → opens the list. */
export function CartBar({ onOpen }: { onOpen: () => void }) {
  const c = useTheme();
  const { t } = useTranslation();
  const items = useMealCartStore((s) => s.items);
  if (items.length === 0) return null;
  const tot = cartTotals(items);
  return (
    <PressScale
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={t('log.viewList')}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 14, marginBottom: 14,
        borderRadius: 16, backgroundColor: c.surfaceInverse,
      }}
    >
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="list" size={18} color={c.onAccent} />
        <View style={{
          position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 4,
          backgroundColor: c.textInverse, alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 11, fontWeight: '700', color: c.surfaceInverse }}>{items.length}</Text>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: c.textInverse }}>{t('log.listTitle')}</Text>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textInverse, opacity: 0.7, marginTop: 1 }}>
          {t('log.listSummary', { n: String(items.length), kcal: Math.round(tot.calories).toLocaleString(), p: String(Math.round(tot.protein)) })}
        </Text>
      </View>
      <Text style={{ fontSize: 14, fontWeight: '800', color: c.accent }}>{t('log.viewList')}</Text>
      <Ionicons name="chevron-forward" size={16} color={c.accent} />
    </PressScale>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const c = useTheme();
  const { t } = useTranslation();
  const btn = (icon: string, delta: number, label: string) => (
    <Pressable
      onPress={() => onChange(value + delta)}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: 30, height: 30, borderRadius: 9, borderWidth: 1.5, borderColor: c.borderPrimary, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons name={icon as any} size={15} color={c.textPrimary} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {btn('remove', value <= 1 ? -0.5 : -1, t('log.lessServing'))}
      <Text style={{ fontFamily: FONTS.mono, fontSize: 14, fontWeight: '700', minWidth: 30, textAlign: 'center', color: c.textPrimary }}>
        ×{value}
      </Text>
      {btn('add', value < 1 ? 0.5 : 1, t('log.moreServing'))}
    </View>
  );
}

/** The list itself: each item with servings, remove, totals, and "log all". */
export function CartSheet({ visible, onClose, onLogAll, logging }: {
  visible: boolean;
  onClose: () => void;
  onLogAll: () => void;
  logging: boolean;
}) {
  const c = useTheme();
  const { t } = useTranslation();
  const { items, setServings, remove, clear } = useMealCartStore();
  const tot = cartTotals(items);
  const [confirmClear, setConfirmClear] = useState(false);

  const askClear = () => {
    setConfirmClear(true);
    Alert.alert(t('log.clearListConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel', onPress: () => setConfirmClear(false) },
      { text: t('log.clearList'), style: 'destructive', onPress: () => { clear(); setConfirmClear(false); onClose(); } },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.backgroundPrimary }} edges={['bottom']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12 }}>
          <Text style={{ flex: 1, fontSize: 26, fontWeight: '800', letterSpacing: -0.7, color: c.textPrimary }}>{t('log.listTitle')}</Text>
          {items.length > 0 ? (
            <Pressable onPress={askClear} disabled={confirmClear} hitSlop={8} accessibilityRole="button">
              <Text style={{ fontSize: 14, fontWeight: '700', color: c.textSecondary }}>{t('log.clearList')}</Text>
            </Pressable>
          ) : null}
          <IconButton icon="close" onPress={onClose} accessibilityLabel={t('common.close')} />
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 16, gap: 8 }}>
          {items.length === 0 ? (
            <Text style={{ fontSize: 15, color: c.textSecondary, paddingVertical: 24, textAlign: 'center' }}>{t('log.listEmpty')}</Text>
          ) : (
            items.map((it) => (
              <View
                key={it.id}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10,
                  borderRadius: 16, borderWidth: STROKE.card, borderColor: c.borderPrimary, backgroundColor: c.cardBackground,
                }}
              >
                <View style={{ width: 48, height: 48, borderRadius: 12, overflow: 'hidden', backgroundColor: c.cardBackgroundSecondary, alignItems: 'center', justifyContent: 'center' }}>
                  {it.thumbUri ? (
                    <Image source={{ uri: it.thumbUri }} style={{ width: 48, height: 48 }} accessibilityIgnoresInvertColors />
                  ) : (
                    <Ionicons name={SOURCE_ICON[it.source] as any} size={22} color={c.textPrimary} />
                  )}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text numberOfLines={2} style={{ fontSize: 15, fontWeight: '700', color: c.textPrimary }}>{it.food}</Text>
                  <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary }}>
                    {Math.round(it.calories * it.servings)} kcal · P {Math.round(it.protein * it.servings)}g · C {Math.round(it.carbs * it.servings)}g · F {Math.round(it.fat * it.servings)}g
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                    <Stepper value={it.servings} onChange={(v) => setServings(it.id, v)} />
                    <Pressable onPress={() => remove(it.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${t('log.removeItem')} ${it.food}`}>
                      <Ionicons name="trash-outline" size={18} color={c.textSecondary} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {items.length > 0 ? (
          <View style={{ paddingHorizontal: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.divider, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View>
                <Label>{t('log.listTotal')}</Label>
                <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.textSecondary, marginTop: 4 }}>
                  P {Math.round(tot.protein)}g · C {Math.round(tot.carbs)}g · F {Math.round(tot.fat)}g
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={{ fontSize: 34, fontWeight: '800', letterSpacing: -1.2, color: c.textPrimary }}>{Math.round(tot.calories).toLocaleString()}</Text>
                <Label style={{ fontSize: 10 }}>KCAL</Label>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <Button label={t('log.keepScanning')} variant="outline" onPress={onClose} style={{ flex: 1 }} />
              <Button
                label={t('log.logAll', { n: String(items.length) })}
                icon="checkmark-done"
                loading={logging}
                onPress={onLogAll}
                style={{ flex: 1.4 }}
              />
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

