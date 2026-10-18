import { useMemo, useState } from 'react';
import { View, Modal, FlatList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { Button, Chip, IconButton, PressScale, TextField } from '@/components/ui/bxc';
import { EXERCISES, MUSCLE_GROUPS, exerciseName, matchesSearch, type MuscleGroup } from '@/constants/exercises';
import ExerciseThumb from './ExerciseThumb';

/** Exercise library sheet: search, filter by muscle group, pick several. */
export default function ExercisePicker({ visible, onClose, onAdd, exclude = [] }: {
  visible: boolean;
  onClose: () => void;
  onAdd: (ids: string[]) => void;
  /** Already in the day/workout; shown as added. */
  exclude?: string[];
}) {
  const c = useTheme();
  const { t, language } = useTranslation();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroup | 'all'>('all');
  const [picked, setPicked] = useState<string[]>([]);

  const list = useMemo(
    () => EXERCISES.filter((e) => (group === 'all' || e.group === group) && matchesSearch(e, query)),
    [group, query],
  );

  const close = () => {
    setPicked([]);
    setQuery('');
    onClose();
  };

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined} onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.backgroundPrimary }} edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']}>
        <View style={{ paddingHorizontal: 18, paddingTop: 18, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.8, color: c.textPrimary }}>{t('train.libraryTitle')}</Text>
            <IconButton icon="close" onPress={close} accessibilityLabel={t('common.close')} />
          </View>
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder={t('train.search')}
            autoCorrect={false}
            returnKeyType="search"
            right={query ? <IconButton icon="close-circle" onPress={() => setQuery('')} accessibilityLabel={t('common.close')} style={{ borderWidth: 0 }} /> : <Ionicons name="search" size={18} color={c.textSecondary} style={{ marginRight: 12 }} />}
          />
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={['all', ...MUSCLE_GROUPS] as (MuscleGroup | 'all')[]}
            keyExtractor={(g) => g}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => (
              <Chip
                label={item === 'all' ? t('train.all') : t(`train.group.${item}`)}
                selected={group === item}
                onPress={() => setGroup(item)}
                style={{ paddingHorizontal: 14 }}
              />
            )}
          />
        </View>
        <FlatList
          data={list}
          keyExtractor={(e) => e.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 18, paddingBottom: 24, gap: 8 }}
          ListEmptyComponent={<Text style={{ color: c.textSecondary, textAlign: 'center', marginTop: 32 }}>{t('train.noResults')}</Text>}
          renderItem={({ item }) => {
            const already = exclude.includes(item.id);
            const on = picked.includes(item.id);
            return (
              <PressScale
                onPress={() => toggle(item.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 16,
                  borderWidth: 2, borderColor: on ? c.ink : c.borderSecondary, backgroundColor: on ? c.accent : c.cardBackground,
                }}
              >
                <ExerciseThumb id={item.id} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '700', color: on ? c.onAccent : c.textPrimary }}>{exerciseName(item.id, language)}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: FONTS.mono, fontSize: 12, marginTop: 2, color: on ? c.onAccent : c.textSecondary }}>
                    {t(`train.equip.${item.equipment}`)} · {item.muscles.map((m) => t(`train.muscle.${m}`)).join(' ')}
                  </Text>
                </View>
                {already && !on ? <Ionicons name="checkmark-done" size={18} color={c.textSecondary} /> : null}
                <View style={{
                  width: 30, height: 30, borderRadius: 10, borderWidth: 2, borderColor: on ? c.ink : c.borderPrimary,
                  backgroundColor: on ? c.ink : 'transparent', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name={on ? 'checkmark' : 'add'} size={18} color={on ? c.accent : c.textPrimary} />
                </View>
              </PressScale>
            );
          }}
        />
        <View style={{ paddingHorizontal: 18, paddingBottom: 8 }}>
          <Button
            label={t('train.addN', { n: String(picked.length) })}
            icon="add"
            disabled={picked.length === 0}
            onPress={() => {
              onAdd(picked);
              close();
            }}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
