import { useEffect, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Button, Card, IconButton, Label, Sticker, TextField } from '@/components/ui/bxc';
import { showToast } from '@/components/ui/Toast';
import { PetSprite } from '@/components/pet/PetSprite';
import KindPicker from '@/components/pet/KindPicker';
import { stageLabel } from '@/components/pet/PetHome';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { STAGE_XP, buddyImage, type BuddyKind } from '@/constants/pets';
import { usePetStore } from '@/store/usePetStore';

const SCENE_BG = '#FFF3C4';

/** 图鉴: graduated buddies, and the graduation flow once the buddy is grown. */
export default function PetCollectionScreen() {
  const c = useTheme();
  const { t, language } = useTranslation();
  const router = useRouter();
  const s = usePetStore((st) => st.state);
  const refresh = usePetStore((st) => st.refresh);
  const graduate = usePetStore((st) => st.graduate);
  const [nextKind, setNextKind] = useState<BuddyKind>('cat');
  const [nextName, setNextName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!s) refresh();
  }, []);

  const p = s?.profile;
  const items = s?.collection ?? [];
  const tt = t as (k: string, params?: Record<string, string>) => string;

  const doGraduate = async () => {
    if (!nextName.trim() || saving || !p) return;
    setSaving(true);
    const old = p.buddyName;
    try {
      await graduate({ nextKind, nextName: nextName.trim() });
      setNextName('');
      showToast({ message: t('pet.graduatedToast', { name: old }), icon: 'school-outline' as any });
    } catch {
      showToast({ message: t('pet.graduateFailed') });
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(language, { month: 'numeric', day: 'numeric' });
    } catch {
      return iso.slice(5, 10);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.backgroundPrimary }} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12 }}>
          <IconButton icon="chevron-back" onPress={() => router.back()} accessibilityLabel={t('common.close')} />
          <Text style={{ flex: 1, fontSize: 24, fontWeight: '800', letterSpacing: -0.6, color: c.textPrimary }}>{t('pet.collection')}</Text>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 13, color: c.textSecondary }}>{t('pet.graduatedCount', { n: String(items.length) })}</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32, gap: 12 }} keyboardShouldPersistTaps="handled">
          {/* Current buddy */}
          {p && s ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, backgroundColor: c.surfaceInverse }}>
              <View style={{ width: 96, height: 96, borderRadius: 18, backgroundColor: SCENE_BG, borderWidth: 2, borderColor: c.accent, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
                <PetSprite source={buddyImage(p.buddyKind, s.stage ?? 1)} size={90} shadow={false} onPress={() => {}} accessibilityLabel={p.buddyName} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 0.8, color: c.accent }}>
                  {s.canGraduate ? t('pet.readyToGraduate') : t('pet.nowTraining')}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 22, fontWeight: '800', color: c.textInverse }}>
                  {p.buddyName} · {stageLabel(tt, s.stage ?? 1)}
                </Text>
                <Text style={{ fontSize: 13, color: c.textInverse, opacity: 0.75 }}>
                  {s.canGraduate
                    ? t('pet.day', { n: String(p.buddyDay) })
                    : t('pet.untilGraduate', { n: String(Math.max(0, STAGE_XP[1] - (s.xp ?? 0))) })}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Graduation */}
          {p && s?.canGraduate ? (
            <Card padding={14} style={{ gap: 10 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: c.textPrimary }}>{t('pet.graduateTitle', { name: p.buddyName })}</Text>
              <Text style={{ fontSize: 14, lineHeight: 20, color: c.textSecondary }}>{t('pet.graduateBody')}</Text>
              <Label style={{ marginTop: 4 }}>{t('pet.nextLabel')}</Label>
              <KindPicker value={nextKind} onChange={setNextKind} />
              <Label style={{ marginTop: 4 }}>{t('pet.buddyNameLabel')}</Label>
              <TextField value={nextName} onChangeText={setNextName} maxLength={12} placeholder={t('pet.buddyNamePlaceholder')} />
              <Button
                label={nextName.trim() ? t('pet.graduateCta', { name: nextName.trim() }) : t('pet.graduateCtaPlain')}
                onPress={doGraduate}
                loading={saving}
                disabled={!nextName.trim()}
                style={{ marginTop: 4 }}
              />
            </Card>
          ) : null}

          {/* Graduated */}
          <Label style={{ marginTop: 4 }}>{t('pet.graduated')}</Label>
          {items.length === 0 ? (
            <View style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: c.borderSecondary, borderRadius: 20, padding: 18, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, lineHeight: 20, color: c.textSecondary, textAlign: 'center' }}>{t('pet.collectionEmpty')}</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {[...items].reverse().map((it) => (
                <View key={it.id} style={{
                  width: '48%', flexGrow: 1, borderWidth: 2, borderColor: c.borderPrimary, borderRadius: 20,
                  backgroundColor: c.cardBackground, paddingTop: 10, paddingBottom: 12, paddingHorizontal: 10, alignItems: 'center', gap: 4,
                }}>
                  <Sticker background={c.ink} color={c.accent} rotate={-5} style={{ position: 'absolute', top: 8, left: 8, paddingHorizontal: 7, paddingVertical: 3, zIndex: 1 }}>
                    {fmtDate(it.graduatedAt)}
                  </Sticker>
                  <PetSprite source={buddyImage(it.kind, 3)} size={104} onPress={() => {}} accessibilityLabel={it.name} />
                  <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: '800', color: c.textPrimary }}>{it.name}</Text>
                  <Text style={{ fontSize: 12, color: c.textSecondary }}>
                    {tt(`pet.kind.${it.kind}`)} · {t('pet.graduatedDays', { n: String(it.days) })}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
