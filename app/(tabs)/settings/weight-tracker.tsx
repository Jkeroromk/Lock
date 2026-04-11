import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { useStore } from '@/store/useStore';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { fetchWeightRecords, logWeight, deleteWeight } from '@/services/api';

interface WeightRecord {
  id: string;
  weight: number;
  recordedAt: string;
  note?: string;
}

export default function WeightTrackerScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { t } = useTranslation();
  const { language } = useStore();

  const [records, setRecords] = useState<WeightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [inputWeight, setInputWeight] = useState('');
  const [inputNote, setInputNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await fetchWeightRecords();
      setRecords(data);
    } catch {}
  };

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [])
  );

  const handleSave = async () => {
    const w = parseFloat(inputWeight);
    if (!inputWeight || isNaN(w) || w < 20 || w > 500) {
      Alert.alert(t('weightTracker.invalidWeight'), t('weightTracker.invalidWeightHint'));
      return;
    }
    setSaving(true);
    try {
      await logWeight(w, inputNote.trim() || undefined);
      await load();
      setShowModal(false);
      setInputWeight('');
      setInputNote('');
    } catch (e: any) {
      Alert.alert(t('weightTracker.saveFailed'), e.message || t('common.retry'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('weightTracker.deleteTitle'), t('weightTracker.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
        onPress: async () => {
          try {
            await deleteWeight(id);
            setRecords((r) => r.filter((x) => x.id !== id));
          } catch {}
        },
      },
    ]);
  };

  const latest = records[0];
  const previous = records[1];
  const trend = latest && previous
    ? Number(latest.weight) - Number(previous.weight)
    : null;
  const startWeight = records.length > 1 ? Number(records[records.length - 1].weight) : null;
  const totalChange = latest && startWeight ? Number(latest.weight) - startWeight : null;

  const dateLocale = language === 'en-US' ? 'en-US' : language;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: DIMENSIONS.CARD_PADDING,
        paddingVertical: DIMENSIONS.SPACING,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: DIMENSIONS.SPACING }}>
            <Ionicons name="chevron-back" size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: colors.textPrimary }}>
            {t('weightTracker.title')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setInputWeight(latest ? String(Number(latest.weight)) : '');
            setShowModal(true);
          }}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingHorizontal: DIMENSIONS.SPACING, paddingVertical: DIMENSIONS.SPACING * 0.5,
            backgroundColor: colors.textPrimary, borderRadius: 14,
          }}
        >
          <Ionicons name="add" size={TYPOGRAPHY.iconXS} color={colors.backgroundPrimary} />
          <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '900', color: colors.backgroundPrimary }}>
            {t('weightTracker.record')}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {latest && (
            <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.8, marginBottom: DIMENSIONS.SPACING }}>
              {[
                { label: t('weightTracker.currentWeight'), value: `${Number(latest.weight).toFixed(1)}`, diff: null },
                {
                  label: t('weightTracker.vsLast'),
                  value: trend !== null ? `${trend > 0 ? '+' : ''}${trend.toFixed(1)}` : '—',
                  diff: trend,
                },
                {
                  label: t('weightTracker.totalChange'),
                  value: totalChange !== null && records.length > 1 ? `${totalChange > 0 ? '+' : ''}${totalChange.toFixed(1)}` : '—',
                  diff: totalChange,
                },
              ].map(({ label, value, diff }) => (
                <View key={label} style={{
                  flex: 1, borderRadius: 20, padding: DIMENSIONS.SPACING * 1.2,
                  backgroundColor: colors.cardBackground,
                  borderWidth: 1, borderColor: colors.borderPrimary,
                }}>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>
                    {label}
                  </Text>
                  <Text style={{
                    fontSize: TYPOGRAPHY.titleL, fontWeight: '900',
                    color: diff === null ? colors.textPrimary
                      : diff < 0 ? '#10B981'
                      : diff > 0 ? '#EF4444'
                      : colors.textPrimary,
                  }}>
                    {value}
                  </Text>
                  {value !== '—' && <Text style={{ fontSize: TYPOGRAPHY.bodyXS, color: colors.textSecondary, fontWeight: '600' }}>kg</Text>}
                </View>
              ))}
            </View>
          )}

          {records.length === 0 ? (
            <View style={{
              borderRadius: 20, padding: DIMENSIONS.SPACING * 2.5,
              backgroundColor: colors.cardBackground,
              borderWidth: 1, borderColor: colors.borderPrimary,
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 40, marginBottom: DIMENSIONS.SPACING * 0.8 }}>⚖️</Text>
              <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary, marginBottom: 6 }}>
                {t('weightTracker.noRecords')}
              </Text>
              <Text style={{ fontSize: TYPOGRAPHY.bodyS, color: colors.textSecondary, textAlign: 'center' }}>
                {t('weightTracker.noRecordsHint')}
              </Text>
            </View>
          ) : (
            <View style={{
              borderRadius: 20,
              backgroundColor: colors.cardBackground,
              borderWidth: 1, borderColor: colors.borderPrimary,
              overflow: 'hidden',
            }}>
              {records.map((record, index) => {
                const date = new Date(record.recordedAt);
                const dateStr = date.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
                const weekday = date.toLocaleDateString(dateLocale, { weekday: 'short' });
                const prev = records[index + 1];
                const diff = prev ? Number(record.weight) - Number(prev.weight) : null;

                return (
                  <View key={record.id} style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: DIMENSIONS.SPACING * 0.9,
                    paddingHorizontal: DIMENSIONS.SPACING * 1.2,
                    borderBottomWidth: index < records.length - 1 ? 1 : 0,
                    borderBottomColor: colors.borderPrimary,
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '800', color: colors.textPrimary }}>
                        {dateStr} {weekday}
                      </Text>
                      {record.note ? (
                        <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary, marginTop: 2 }}>
                          {record.note}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end', marginRight: DIMENSIONS.SPACING }}>
                      <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>
                        {Number(record.weight).toFixed(1)} kg
                      </Text>
                      {diff !== null && (
                        <Text style={{
                          fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700',
                          color: diff < 0 ? '#10B981' : diff > 0 ? '#EF4444' : colors.textSecondary,
                        }}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(record.id)}>
                      <Ionicons name="trash-outline" size={TYPOGRAPHY.iconXS} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
            activeOpacity={1}
            onPress={() => setShowModal(false)}
          >
            <TouchableOpacity activeOpacity={1}>
              <View style={{
                backgroundColor: colors.backgroundPrimary,
                borderTopLeftRadius: 32, borderTopRightRadius: 32,
                padding: DIMENSIONS.CARD_PADDING,
                paddingBottom: DIMENSIONS.CARD_PADDING * 2,
              }}>
                <View style={{
                  width: 40, height: 4, borderRadius: 2,
                  backgroundColor: colors.borderPrimary,
                  alignSelf: 'center', marginBottom: DIMENSIONS.SPACING * 1.2,
                }} />
                <Text style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: colors.textPrimary, marginBottom: DIMENSIONS.SPACING * 1.5 }}>
                  {t('weightTracker.logWeight')}
                </Text>

                <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textSecondary, marginBottom: DIMENSIONS.SPACING * 0.5 }}>
                  {t('weightTracker.weightLabel')}
                </Text>
                <TextInput
                  value={inputWeight}
                  onChangeText={setInputWeight}
                  keyboardType="decimal-pad"
                  placeholder={t('weightTracker.weightPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  style={{
                    borderRadius: 16, borderWidth: 2, borderColor: colors.borderPrimary,
                    backgroundColor: colors.cardBackground,
                    paddingHorizontal: DIMENSIONS.SPACING, paddingVertical: DIMENSIONS.SPACING * 0.9,
                    fontSize: TYPOGRAPHY.bodyM, color: colors.textPrimary,
                    marginBottom: DIMENSIONS.SPACING,
                  }}
                />

                <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textSecondary, marginBottom: DIMENSIONS.SPACING * 0.5 }}>
                  {t('weightTracker.noteLabel')} ({t('common.optional')})
                </Text>
                <TextInput
                  value={inputNote}
                  onChangeText={setInputNote}
                  placeholder={t('weightTracker.notePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  style={{
                    borderRadius: 16, borderWidth: 2, borderColor: colors.borderPrimary,
                    backgroundColor: colors.cardBackground,
                    paddingHorizontal: DIMENSIONS.SPACING, paddingVertical: DIMENSIONS.SPACING * 0.9,
                    fontSize: TYPOGRAPHY.bodyM, color: colors.textPrimary,
                    marginBottom: DIMENSIONS.SPACING * 1.5,
                  }}
                />

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  style={{
                    borderRadius: 16, paddingVertical: DIMENSIONS.SPACING,
                    backgroundColor: colors.textPrimary, alignItems: 'center',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving
                    ? <ActivityIndicator color={colors.backgroundPrimary} />
                    : <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.backgroundPrimary }}>
                        {t('common.save')}
                      </Text>
                  }
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
