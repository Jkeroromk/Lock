import { useEffect, useState } from 'react';
import { View, Modal, Pressable, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import { Button, PressScale } from '@/components/ui/bxc';
import { showToast } from '@/components/ui/Toast';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { HOME_ITEMS, HOME_SLOTS, HOME_DEFAULTS, equippedLooks, type HomeItem, type HomeSlot } from '@/constants/coupleHome';
import { updateHome, type CoupleHome } from '@/services/couple';

/**
 * Our home: the shared points (both of your daily growth since you became a
 * couple) and the furniture shop. Pick a slot, tap a style: one you own goes
 * into the room right away; a new one asks first, then is bought and placed.
 */
export default function HomeShopSheet({ visible, onClose, home, onChanged }: {
  visible: boolean;
  onClose: () => void;
  home: CoupleHome | null | undefined;
  onChanged: (home: CoupleHome) => void;
}) {
  const c = useTheme();
  const { t, language } = useTranslation();
  const insets = useSafeAreaInsets();
  const [slot, setSlot] = useState<HomeSlot>('sofa');
  const [busy, setBusy] = useState<string | null>(null);
  const [local, setLocal] = useState<CoupleHome | null | undefined>(home);
  useEffect(() => { setLocal(home); }, [home]);
  useEffect(() => { if (visible) setSlot('sofa'); }, [visible]);

  const zh = !language || language.startsWith('zh');
  const nameOf = (i: HomeItem) => (zh ? i.name.zh : i.name.en);
  const balance = local?.balance ?? 0;
  const equipped = equippedLooks(local?.equipped);
  const owns = (i: HomeItem) => HOME_DEFAULTS[i.slot] === i.id || !!local?.owned.includes(i.id);

  const apply = async (i: HomeItem, action: 'buy' | 'equip') => {
    setBusy(i.id);
    try {
      const h = await updateHome(action, i.id);
      setLocal(h);
      onChanged(h);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (action === 'buy') showToast({ icon: 'home', message: t('couple.homeBought', { name: nameOf(i) }) });
    } catch (e: any) {
      const code = e?.response?.data?.error;
      showToast({ icon: 'alert-circle', message: code === 'NOT_ENOUGH' ? t('couple.homeNotEnough') : t('couple.loadFailed') });
    } finally {
      setBusy(null);
    }
  };

  const pick = (i: HomeItem) => {
    if (busy || equipped[i.slot] === i.id) return;
    if (owns(i)) { apply(i, 'equip'); return; }
    if (balance < i.price) {
      showToast({ icon: 'time-outline', message: t('couple.homeNeedMore', { n: String(i.price - balance) }) });
      return;
    }
    Alert.alert(t('couple.homeBuyQ', { name: nameOf(i) }), t('couple.homeBuyBody', { n: String(i.price), left: String(balance - i.price) }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('couple.homeBuy'), onPress: () => apply(i, 'buy') },
    ]);
  };

  const items = HOME_ITEMS.filter((i) => i.slot === slot);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.18)' }} accessibilityLabel={t('common.close')} />
      <View style={{
        marginTop: 'auto', maxHeight: '78%', width: '100%', maxWidth: 560, alignSelf: 'center',
        backgroundColor: c.backgroundPrimary, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 2, borderColor: c.ink,
        paddingTop: 10, paddingHorizontal: 18, paddingBottom: insets.bottom + 16,
      }}>
        <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.borderSecondary, marginBottom: 10 }} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: c.textPrimary }}>{t('couple.homeTitle')}</Text>
            <Text style={{ fontFamily: FONTS.mono, fontSize: 11, lineHeight: 15, color: c.textSecondary, marginTop: 2 }}>{t('couple.homeSub')}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: c.textPrimary }}>🪙 {balance.toLocaleString()}</Text>
            <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: c.textSecondary }}>{t('couple.homeEarned', { n: String(local?.earned ?? 0) })}</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: 14, marginHorizontal: -18 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingVertical: 2 }}>
          {HOME_SLOTS.map((s) => {
            const on = s === slot;
            return (
              <PressScale key={s} onPress={() => setSlot(s)} accessibilityRole="tab" accessibilityState={{ selected: on }}
                style={{ minHeight: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 2, borderColor: c.ink, backgroundColor: on ? c.surfaceInverse : c.cardBackground, justifyContent: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: on ? c.textInverse : c.textPrimary }}>{t(`couple.homeSlot_${s}` as any)}</Text>
              </PressScale>
            );
          })}
        </ScrollView>

        <ScrollView style={{ flexShrink: 1, marginTop: 12, marginHorizontal: -8 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 8, paddingBottom: 12, paddingTop: 2 }} showsVerticalScrollIndicator={false}>
          {items.map((i) => {
            const isOn = equipped[i.slot] === i.id;
            const mine = owns(i);
            const label = isOn ? t('couple.homeInUse') : mine ? t('couple.homeUse') : `🪙 ${i.price}`;
            return (
              <PressScale key={i.id} onPress={() => pick(i)} accessibilityRole="button" accessibilityLabel={`${nameOf(i)} ${label}`}
                accessibilityState={{ selected: isOn, busy: busy === i.id }}
                style={{
                  width: '47.5%', flexGrow: 1, padding: 12, gap: 10, borderRadius: 18, borderWidth: 2, borderColor: c.ink,
                  backgroundColor: isOn ? '#FFF6CC' : c.cardBackground,
                  shadowColor: c.ink, shadowOpacity: isOn ? 1 : 0, shadowRadius: 0, shadowOffset: { width: 4, height: 4 },
                  opacity: busy && busy !== i.id ? 0.6 : 1,
                }}>
                <View style={{ height: 56, borderRadius: 12, borderWidth: 2, borderColor: c.ink, overflow: 'hidden', flexDirection: 'row' }}>
                  <View style={{ flex: 2, backgroundColor: i.swatch[0] }} />
                  <View style={{ flex: 1, backgroundColor: i.swatch[1] }} />
                </View>
                <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '800', color: isOn ? '#0A0A0A' : c.textPrimary }}>{nameOf(i)}</Text>
                <Text style={{ fontFamily: FONTS.mono, fontSize: 12, fontWeight: '700', color: isOn ? '#55544F' : mine ? c.textSecondary : c.textPrimary }}>{label}</Text>
              </PressScale>
            );
          })}
        </ScrollView>
        <Button label={t('common.close')} variant="outline" onPress={onClose} />
      </View>
    </Modal>
  );
}
