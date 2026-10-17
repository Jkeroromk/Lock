import { useEffect, useState } from 'react';
import { View, Modal, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Button, Label, TextField } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { AVATAR_OPTIONS, DEFAULT_GIRL, DEFAULT_LOOK, MILESTONES, SWATCH, type AvatarField, type AvatarLook } from '@/lib/game/avatar';

const COLOR_FIELDS: AvatarField[] = ['skin', 'hairColor', 'top', 'bottomColor'];
const ORDER: AvatarField[] = ['gender', 'skin', 'hair', 'hairColor', 'top', 'bottom', 'bottomColor', 'acc'];

/**
 * Bottom sheet for making / restyling the avatar. Every change previews live in
 * the game above the sheet; items unlock with days logged.
 */
export default function AvatarEditor({ visible, create, initialLook, initialName, milestones, lockedGender, saving, onPreview, onCancel, onSave }: {
  visible: boolean;
  create: boolean;
  initialLook: AvatarLook | null;
  initialName: string;
  milestones: number;
  /** Body type fixed by the gender chosen at sign-up; the editor then hides that row. */
  lockedGender?: 'boy' | 'girl' | null;
  saving: boolean;
  onPreview: (look: AvatarLook) => void;
  onCancel: () => void;
  onSave: (look: AvatarLook, name: string) => void;
}) {
  const c = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [look, setLook] = useState<AvatarLook>(initialLook ?? DEFAULT_LOOK);
  const [name, setName] = useState(initialName);

  useEffect(() => { if (visible) { setLook(initialLook ?? DEFAULT_LOOK); setName(initialName); } }, [visible]);

  const lockedAt = (field: AvatarField, value: string) => {
    const i = MILESTONES.findIndex((m) => m.field === field && m.value === value);
    return i >= 0 && i >= milestones ? MILESTONES[i].days : 0;
  };

  const choose = (field: AvatarField, value: string) => {
    if (lockedAt(field, value)) return;
    if (field === 'gender' && lockedGender) return;
    let next = { ...look, [field]: value } as AvatarLook;
    if (lockedGender) next.gender = lockedGender;
    // Switching body type while still on the starter look swaps to that type's starter hair and outfit.
    if (field === 'gender') {
      const starter = value === 'girl' ? DEFAULT_GIRL : { gender: 'boy', hair: DEFAULT_LOOK.hair, hairColor: DEFAULT_LOOK.hairColor, bottom: DEFAULT_LOOK.bottom, bottomColor: DEFAULT_LOOK.bottomColor };
      const onStarter = (value === 'girl' && look.hair === DEFAULT_LOOK.hair && look.bottom === DEFAULT_LOOK.bottom)
        || (value === 'boy' && look.hair === DEFAULT_GIRL.hair && look.bottom === DEFAULT_GIRL.bottom);
      if (onStarter) next = { ...next, ...(starter as Partial<AvatarLook>) };
    }
    setLook(next);
    onPreview(next);
  };

  const optLabel = (field: AvatarField, value: string) => t(`game.opt.${field}.${value}`);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={create ? undefined : onCancel}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{
          maxHeight: height * 0.56, backgroundColor: c.backgroundPrimary, borderTopLeftRadius: 28, borderTopRightRadius: 28,
          borderWidth: 2, borderBottomWidth: 0, borderColor: c.ink, paddingBottom: Math.max(insets.bottom, 12),
        }}>
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderPrimary }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 6, gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: c.textPrimary }}>{create ? t('game.createTitle') : t('game.editorTitle')}</Text>
              {create ? <Text style={{ fontSize: 13, lineHeight: 18, color: c.textSecondary, marginTop: 2 }}>{t('game.createSub')}</Text> : null}
            </View>
            {!create ? (
              <TouchableOpacity onPress={onCancel} accessibilityRole="button" accessibilityLabel={t('common.cancel')} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={22} color={c.textPrimary} />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 12, gap: 14 }}>
            <View style={{ gap: 6 }}>
              <Label>{t('game.nameLabel')}</Label>
              <TextField value={name} onChangeText={(v) => setName(v.slice(0, 12))} placeholder={t('game.namePlaceholder')} maxLength={12} returnKeyType="done" autoCorrect={false} />
            </View>
            {ORDER.filter((f) => !(lockedGender && f === 'gender')).map((field) => (
              <View key={field} style={{ gap: 6 }}>
                <Label>{t(`game.field.${field}`)}</Label>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(AVATAR_OPTIONS[field] as readonly string[]).map((value) => {
                    const selected = look[field] === value;
                    const lock = lockedAt(field, value);
                    const label = optLabel(field, value);
                    const a11y = lock ? `${label}, ${t('game.locked', { days: String(lock) })}` : label;
                    if (COLOR_FIELDS.includes(field) && SWATCH[`${field}.${value}`]) {
                      return (
                        <TouchableOpacity
                          key={value} onPress={() => choose(field, value)} disabled={!!lock}
                          accessibilityRole="button" accessibilityState={{ selected, disabled: !!lock }} accessibilityLabel={a11y}
                          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: selected ? 3 : 1.5, borderColor: selected ? c.textPrimary : c.borderPrimary, opacity: lock ? 0.45 : 1 }}
                        >
                          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: SWATCH[`${field}.${value}`], alignItems: 'center', justifyContent: 'center' }}>
                            {lock ? <Ionicons name="lock-closed" size={13} color="#1b1d2e" /> : null}
                          </View>
                        </TouchableOpacity>
                      );
                    }
                    return (
                      <TouchableOpacity
                        key={value} onPress={() => choose(field, value)} disabled={!!lock}
                        accessibilityRole="button" accessibilityState={{ selected, disabled: !!lock }} accessibilityLabel={a11y}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36, paddingHorizontal: 12, borderRadius: 18,
                          borderWidth: 1.5, borderColor: selected ? c.ink : c.borderPrimary,
                          backgroundColor: selected ? c.accent : c.cardBackground, opacity: lock ? 0.5 : 1,
                        }}
                      >
                        {lock ? <Ionicons name="lock-closed" size={12} color={c.textSecondary} /> : null}
                        <Text style={{ fontSize: 14, fontWeight: '600', color: selected ? c.onAccent : c.textPrimary }}>{label}</Text>
                        {lock ? <Text style={{ fontSize: 11, color: c.textSecondary }}>{t('game.locked', { days: String(lock) })}</Text> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
            <Button
              label={create ? t('game.start') : t('game.save')}
              icon="checkmark"
              variant="solid"
              loading={saving}
              disabled={!name.trim()}
              onPress={() => onSave(look, name.trim())}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
