import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { View, Modal, Pressable, ScrollView, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button, PressScale, TextField } from '@/components/ui/bxc';
import { showToast } from '@/components/ui/Toast';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { addAnniversary, deleteAnniversary, daysSince, nextOccurrence, type Anniversary } from '@/services/couple';
import DateField from '@/components/couple/DateField';

const EMOJIS = ['💕', '🎂', '🎡', '✈️', '🍰', '💍', '🎉', '🌙'];
const fmt = (ymd: string) => ymd.replace(/-/g, '.');
const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Our anniversaries, opened from the anniversary wall in the room: each with
 * how long ago / how long to go, the tapped one highlighted. Either of the two
 * can add one or delete one (not the day you got together).
 */
export default function AnniversarySheet({ visible, onClose, items, highlight, onChanged }: {
  visible: boolean;
  onClose: () => void;
  items: Anniversary[];
  highlight?: string | null;
  onChanged: () => void;
}) {
  const c = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const rows = useRef<Record<string, number>>({});
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayYmd());
  const [yearly, setYearly] = useState(false);
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAdding(false); setTitle(''); setDate(todayYmd()); setYearly(false); setEmoji(EMOJIS[0]);
    if (highlight) setTimeout(() => { const y = rows.current[highlight]; if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - 40), animated: true }); }, 350);
  }, [visible, highlight]);

  const save = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await addAnniversary({ title: title.trim(), date, yearly, emoji });
      setAdding(false); setTitle('');
      onChanged();
    } catch {
      showToast({ icon: 'alert-circle', message: t('couple.loadFailed') });
    } finally {
      setSaving(false);
    }
  };

  const remove = (a: Anniversary) => {
    Alert.alert(t('couple.annDeleteQ'), a.title, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('couple.annDelete'), style: 'destructive', onPress: async () => { try { await deleteAnniversary(a.id); onChanged(); } catch {} } },
    ]);
  };

  const count = (a: Anniversary) => {
    if (a.builtIn) return { n: daysSince(a.date), label: t('couple.annSince') };
    const { days } = nextOccurrence(a);
    if (days === 0) return { n: 0, label: t('couple.annToday') };
    return days > 0 ? { n: days, label: t('couple.annLeft') } : { n: -days, label: t('couple.annPassed') };
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable onPress={onClose} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.18)' }} accessibilityLabel={t('common.close')} />
        <View style={{
          marginTop: 'auto', maxHeight: '82%', width: '100%', maxWidth: 560, alignSelf: 'center',
          backgroundColor: c.backgroundPrimary, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 2, borderColor: c.ink,
          paddingTop: 10, paddingHorizontal: 18, paddingBottom: insets.bottom + 16,
        }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.borderSecondary, marginBottom: 10 }} />
          <Text style={{ fontSize: 24, fontWeight: '800', color: c.textPrimary }}>{t('couple.annTitle')}</Text>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary, marginTop: 2, marginBottom: 12 }}>{t('couple.annSub')}</Text>
          <ScrollView ref={scroll} style={{ flexShrink: 1, marginHorizontal: -8 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 8, paddingTop: 2, paddingBottom: 14 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {items.map((a) => {
              const hl = a.id === highlight;
              const k = count(a);
              return (
                <View key={a.id} onLayout={(e) => { rows.current[a.id] = e.nativeEvent.layout.y; }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, borderWidth: 2, borderColor: c.ink,
                    backgroundColor: hl ? '#FFF6CC' : c.cardBackground,
                    shadowColor: c.ink, shadowOpacity: hl ? 1 : 0, shadowRadius: 0, shadowOffset: { width: 4, height: 4 },
                  }}>
                  <View style={{ width: 46, height: 46, borderRadius: 14, borderWidth: 2, borderColor: c.ink, backgroundColor: '#FFE0E6', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 24 }}>{a.emoji}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '800', color: hl ? '#0A0A0A' : c.textPrimary }}>{a.title}</Text>
                    <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: hl ? '#55544F' : c.textSecondary }}>{a.yearly ? `${a.date.slice(5).replace('-', '.')} · ${t('couple.annYearly')}` : fmt(a.date)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: hl ? '#0A0A0A' : c.textPrimary }}>{t('couple.days', { n: String(k.n) })}</Text>
                    <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: hl ? '#55544F' : c.textSecondary }}>{k.label}</Text>
                  </View>
                  {!a.builtIn ? (
                    <PressScale onPress={() => remove(a)} accessibilityRole="button" accessibilityLabel={t('couple.annDelete')} hitSlop={8}
                      style={{ width: 32, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -6 }}>
                      <Ionicons name="trash-outline" size={17} color={hl ? '#55544F' : c.textSecondary} />
                    </PressScale>
                  ) : null}
                </View>
              );
            })}

            {adding ? (
              <View style={{ gap: 10, padding: 12, borderRadius: 18, borderWidth: 2, borderColor: c.ink, backgroundColor: c.cardBackground }}>
                <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary }}>{t('couple.annName')}</Text>
                <TextField value={title} onChangeText={(v) => setTitle(v.slice(0, 20))} placeholder={t('couple.annNamePh')} maxLength={20} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {EMOJIS.map((e) => (
                    <PressScale key={e} onPress={() => setEmoji(e)} accessibilityRole="radio" accessibilityState={{ selected: e === emoji }}
                      style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 2, borderColor: e === emoji ? c.ink : c.borderSecondary, backgroundColor: e === emoji ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 20 }}>{e}</Text>
                    </PressScale>
                  ))}
                </View>
                <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary }}>{t('couple.annDate')}</Text>
                <DateField value={date} onChange={setDate} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: c.textPrimary }}>{t('couple.annYearly')}</Text>
                  <Switch value={yearly} onValueChange={setYearly} />
                </View>
                <Button label={t('couple.annSave')} onPress={save} loading={saving} disabled={!title.trim()} />
              </View>
            ) : null}
          </ScrollView>
          {!adding ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <Button label={t('couple.annAdd')} onPress={() => setAdding(true)} style={{ flex: 1 }} />
              <Button label={t('common.close')} variant="outline" onPress={onClose} style={{ flex: 1 }} />
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
