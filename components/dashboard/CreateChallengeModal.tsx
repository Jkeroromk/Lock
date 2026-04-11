import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { createChallenge } from '@/services/api';
import { useTranslation } from '@/i18n';

interface CreateChallengeModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TYPE_KEYS = ['CALORIES', 'STREAK', 'STEPS'] as const;
const TYPE_ICONS: Record<string, string> = { CALORIES: 'flame', STREAK: 'calendar', STEPS: 'footsteps' };
const DURATION_DAYS = [7, 14, 30];

export default function CreateChallengeModal({ visible, onClose, onSuccess }: CreateChallengeModalProps) {
  const colors = useTheme();
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('CALORIES');
  const [goalValue, setGoalValue] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!title.trim() || !goalValue) {
      setError(t('challenge.validationError' as any));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + durationDays);
      await createChallenge({
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        goalValue: parseInt(goalValue),
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      });
      setTitle(''); setDescription(''); setGoalValue(''); setType('CALORIES'); setDurationDays(7);
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error || t('challenge.createFailed' as any));
    } finally {
      setLoading(false);
    }
  };

  const unitKey = type === 'CALORIES' ? 'challenge.unitCalories' : type === 'STEPS' ? 'challenge.unitSteps' : 'challenge.unitStreak';
  const typeLabel = (key: string) => t(`challenge.type${key.charAt(0) + key.slice(1).toLowerCase()}` as any);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={onClose}
        >
        <TouchableOpacity activeOpacity={1}>
          <View style={{
            backgroundColor: colors.backgroundPrimary,
            borderTopLeftRadius: 32, borderTopRightRadius: 32,
            padding: DIMENSIONS.CARD_PADDING,
            paddingBottom: DIMENSIONS.CARD_PADDING * 2,
            maxHeight: '90%',
          }}>
            <View style={{
              width: 40, height: 4, borderRadius: 2,
              backgroundColor: colors.borderPrimary,
              alignSelf: 'center', marginBottom: DIMENSIONS.SPACING * 1.2,
            }} />
            <Text style={{
              fontSize: TYPOGRAPHY.bodyL, fontWeight: '900',
              color: colors.textPrimary, marginBottom: DIMENSIONS.SPACING * 1.5,
            }}>
              {t('challenge.create' as any)}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Title */}
              <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: DIMENSIONS.SPACING * 0.5 }}>
                {t('challenge.name' as any)}
              </Text>
              <TextInput
                value={title}
                onChangeText={(v) => { setTitle(v); setError(''); }}
                placeholder={t('challenge.namePlaceholder' as any)}
                placeholderTextColor={colors.textSecondary}
                style={{
                  borderRadius: 14, borderWidth: 2, borderColor: colors.borderPrimary,
                  backgroundColor: colors.cardBackground,
                  padding: DIMENSIONS.SPACING * 0.9,
                  fontSize: TYPOGRAPHY.bodyM, color: colors.textPrimary,
                  marginBottom: DIMENSIONS.SPACING * 1.2,
                }}
              />

              {/* Type */}
              <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: DIMENSIONS.SPACING * 0.5 }}>
                {t('challenge.type' as any)}
              </Text>
              <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.6, marginBottom: DIMENSIONS.SPACING * 1.2 }}>
                {TYPE_KEYS.map((key) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setType(key)}
                    style={{
                      flex: 1, borderRadius: 14, padding: DIMENSIONS.SPACING * 0.8,
                      backgroundColor: type === key ? colors.textPrimary : colors.cardBackground,
                      borderWidth: 2, borderColor: type === key ? colors.textPrimary : colors.borderPrimary,
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons
                      name={TYPE_ICONS[key] as any}
                      size={TYPOGRAPHY.iconXS}
                      color={type === key ? colors.backgroundPrimary : colors.textPrimary}
                    />
                    <Text style={{
                      fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', marginTop: 4,
                      color: type === key ? colors.backgroundPrimary : colors.textPrimary,
                      textAlign: 'center',
                    }}>
                      {typeLabel(key)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Goal value */}
              <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: DIMENSIONS.SPACING * 0.5 }}>
                {t('challenge.dailyGoal' as any)} ({t(unitKey as any)})
              </Text>
              <TextInput
                value={goalValue}
                onChangeText={(v) => { setGoalValue(v); setError(''); }}
                placeholder={type === 'CALORIES' ? '2000' : type === 'STEPS' ? '10000' : '7'}
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                style={{
                  borderRadius: 14, borderWidth: 2, borderColor: colors.borderPrimary,
                  backgroundColor: colors.cardBackground,
                  padding: DIMENSIONS.SPACING * 0.9,
                  fontSize: TYPOGRAPHY.bodyM, color: colors.textPrimary,
                  marginBottom: DIMENSIONS.SPACING * 1.2,
                }}
              />

              {/* Duration */}
              <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: DIMENSIONS.SPACING * 0.5 }}>
                {t('challenge.duration' as any)}
              </Text>
              <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.6, marginBottom: DIMENSIONS.SPACING * 1.5 }}>
                {DURATION_DAYS.map((days) => (
                  <TouchableOpacity
                    key={days}
                    onPress={() => setDurationDays(days)}
                    style={{
                      flex: 1, borderRadius: 14, paddingVertical: DIMENSIONS.SPACING * 0.7,
                      backgroundColor: durationDays === days ? colors.textPrimary : colors.cardBackground,
                      borderWidth: 2, borderColor: durationDays === days ? colors.textPrimary : colors.borderPrimary,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{
                      fontSize: TYPOGRAPHY.bodyS, fontWeight: '900',
                      color: durationDays === days ? colors.backgroundPrimary : colors.textPrimary,
                    }}>
                      {(t('challenge.daysCount' as any) as string).replace('{days}', String(days))}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {error ? (
                <Text style={{ fontSize: TYPOGRAPHY.bodyXS, color: '#EF4444', marginBottom: DIMENSIONS.SPACING, fontWeight: '600' }}>
                  {error}
                </Text>
              ) : null}

              <TouchableOpacity
                onPress={handleCreate}
                disabled={loading}
                style={{
                  borderRadius: 16, paddingVertical: DIMENSIONS.SPACING * 0.9,
                  backgroundColor: colors.textPrimary, alignItems: 'center',
                }}
              >
                {loading ? (
                  <ActivityIndicator color={colors.backgroundPrimary} />
                ) : (
                  <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.backgroundPrimary }}>
                    {t('challenge.create' as any)}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}
