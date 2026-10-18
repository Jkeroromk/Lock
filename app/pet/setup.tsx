import { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Button, IconButton, Label, TextField } from '@/components/ui/bxc';
import { showToast } from '@/components/ui/Toast';
import { PetSprite } from '@/components/pet/PetSprite';
import KindPicker from '@/components/pet/KindPicker';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { COACH_IMAGES, type BuddyKind } from '@/constants/pets';
import { usePetStore } from '@/store/usePetStore';

/** First visit to 伙伴: name the bichon coach, pick a buddy, name it. */
export default function PetSetupScreen() {
  const c = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const setup = usePetStore((s) => s.setup);
  const [coachName, setCoachName] = useState('');
  const [kind, setKind] = useState<BuddyKind>('corgi');
  const [buddyName, setBuddyName] = useState('');
  const [saving, setSaving] = useState(false);

  const ready = coachName.trim().length > 0 && buddyName.trim().length > 0;

  const submit = async () => {
    if (!ready || saving) return;
    setSaving(true);
    try {
      await setup({ coachName: coachName.trim(), buddyKind: kind, buddyName: buddyName.trim() });
      router.back();
    } catch {
      showToast({ message: t('pet.setupFailed') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.backgroundPrimary }} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 6 }}>
          <IconButton icon="close" onPress={() => router.back()} accessibilityLabel={t('common.close')} />
          <Text style={{ flex: 1, fontSize: 24, fontWeight: '800', letterSpacing: -0.6, color: c.textPrimary }}>{t('pet.setupTitle')}</Text>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24, gap: 12 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
            <PetSprite source={COACH_IMAGES.wave} size={120} onPress={() => {}} accessibilityLabel={t('pet.setupTitle')} />
            <View style={{
              flex: 1, marginBottom: 24, paddingHorizontal: 13, paddingVertical: 11, borderWidth: 2, borderColor: c.borderPrimary,
              backgroundColor: c.cardBackground, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderBottomLeftRadius: 4,
            }}>
              <Text style={{ fontSize: 15, fontWeight: '600', lineHeight: 21, color: c.textPrimary }}>
                {coachName.trim() ? t('pet.setupIntroNamed', { coach: coachName.trim() }) : t('pet.setupIntro')}
              </Text>
            </View>
          </View>

          <Label>{t('pet.coachNameLabel')}</Label>
          <TextField value={coachName} onChangeText={setCoachName} maxLength={12} placeholder={t('pet.coachNamePlaceholder')} returnKeyType="next" />

          <Label style={{ marginTop: 6 }}>{t('pet.pickLabel')}</Label>
          <KindPicker value={kind} onChange={setKind} />

          <Label style={{ marginTop: 6 }}>{t('pet.buddyNameLabel')}</Label>
          <TextField value={buddyName} onChangeText={setBuddyName} maxLength={12} placeholder={t('pet.buddyNamePlaceholder')} returnKeyType="done" onSubmitEditing={submit} />
        </ScrollView>
        <View style={{ paddingHorizontal: 18, paddingBottom: 8 }}>
          <Button label={t('pet.confirm')} variant="solid" onPress={submit} loading={saving} disabled={!ready} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
