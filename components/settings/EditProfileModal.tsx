import {
  View, Text, Modal, TextInput, TouchableOpacity,
  Alert, Platform, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { updateProfile } from '@/services/api';
import type { Gender, Goal } from '@/store/useStore';

interface User {
  id?: string;
  name?: string;
  email?: string;
  height?: number;
  age?: number;
  weight?: number;
  gender?: Gender;
  goal?: Goal;
}

interface EditProfileModalProps {
  visible: boolean;
  user: User | null;
  onSave: (updated: Partial<User>) => void;
  onCancel: () => void;
}

export default function EditProfileModal({ visible, user, onSave, onCancel }: EditProfileModalProps) {
  const { t } = useTranslation();
  const colors = useTheme();

  const [name, setName] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [goal, setGoal] = useState<Goal | ''>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && user) {
      setName(user.name || '');
      setHeight(user.height ? String(user.height) : '');
      setWeight(user.weight ? String(user.weight) : '');
      setAge(user.age ? String(user.age) : '');
      setGender(user.gender || '');
      setGoal(user.goal || '');
    }
  }, [visible, user]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('settings.error'), t('settings.nameRequired'));
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        height: height ? parseInt(height) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        age: age ? parseInt(age) : undefined,
        gender: gender || undefined,
        goal: goal || undefined,
      });
      onSave({
        name: name.trim(),
        height: height ? parseInt(height) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        age: age ? parseInt(age) : undefined,
        gender: gender || undefined,
        goal: goal || undefined,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || t('settings.error');
      Alert.alert(t('settings.error'), msg);
    } finally {
      setSaving(false);
    }
  };

  const genders: { value: Gender; label: string }[] = [
    { value: 'male', label: t('settings.genderOptions.male') },
    { value: 'female', label: t('settings.genderOptions.female') },
    { value: 'other', label: t('settings.genderOptions.other') },
  ];

  const goals: { value: Goal; label: string }[] = [
    { value: 'lose_weight', label: t('settings.goalOptions.lose_weight') },
    { value: 'lose_fat', label: t('settings.goalOptions.lose_fat') },
    { value: 'gain_muscle', label: t('settings.goalOptions.gain_muscle') },
  ];

  const inputStyle = {
    width: '100%' as const,
    padding: DIMENSIONS.SPACING * 0.9,
    backgroundColor: colors.cardBackgroundSecondary,
    borderRadius: 12,
    color: colors.textPrimary,
    fontSize: TYPOGRAPHY.bodyS,
    fontWeight: '600' as const,
    borderWidth: 2,
    borderColor: colors.borderSecondary,
  };

  const labelStyle = {
    fontSize: TYPOGRAPHY.bodyXS,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    marginBottom: DIMENSIONS.SPACING * 0.4,
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}>
          <View style={{
            backgroundColor: colors.cardBackground,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: '90%',
            borderWidth: 2,
            borderColor: colors.borderPrimary,
          }}>
            {/* Handle bar */}
            <View style={{ alignItems: 'center', paddingTop: DIMENSIONS.SPACING * 0.8 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderPrimary }} />
            </View>

            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: DIMENSIONS.CARD_PADDING,
              paddingVertical: DIMENSIONS.SPACING,
            }}>
              <Text style={{ fontSize: TYPOGRAPHY.title, fontWeight: '900', color: colors.textPrimary }}>
                {t('settings.editProfile')}
              </Text>
              <TouchableOpacity onPress={onCancel} style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: colors.cardBackgroundSecondary,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: colors.borderSecondary,
              }}>
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingBottom: 40 }}
            >
              {/* Name */}
              <View style={{ marginBottom: DIMENSIONS.SPACING * 0.8 }}>
                <Text style={labelStyle}>{t('settings.name')}</Text>
                <TextInput
                  style={inputStyle}
                  placeholder={t('settings.namePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              {/* Height + Weight side by side */}
              <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.6, marginBottom: DIMENSIONS.SPACING * 0.8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={labelStyle}>{t('settings.height')} ({t('settings.cm')})</Text>
                  <TextInput
                    style={inputStyle}
                    placeholder="170"
                    placeholderTextColor={colors.textSecondary}
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={labelStyle}>{t('settings.weight')} ({t('settings.kg')})</Text>
                  <TextInput
                    style={inputStyle}
                    placeholder="65"
                    placeholderTextColor={colors.textSecondary}
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Age */}
              <View style={{ marginBottom: DIMENSIONS.SPACING * 0.8 }}>
                <Text style={labelStyle}>{t('settings.age')} ({t('settings.years')})</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="25"
                  placeholderTextColor={colors.textSecondary}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                />
              </View>

              {/* Gender */}
              <View style={{ marginBottom: DIMENSIONS.SPACING * 0.8 }}>
                <Text style={labelStyle}>{t('settings.gender')}</Text>
                <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.5 }}>
                  {genders.map((g) => (
                    <TouchableOpacity
                      key={g.value}
                      onPress={() => setGender(g.value)}
                      style={{
                        flex: 1,
                        paddingVertical: DIMENSIONS.SPACING * 0.7,
                        borderRadius: 12,
                        alignItems: 'center',
                        backgroundColor: gender === g.value ? colors.textPrimary : colors.cardBackgroundSecondary,
                        borderWidth: 2,
                        borderColor: gender === g.value ? colors.textPrimary : colors.borderSecondary,
                      }}
                    >
                      <Text style={{
                        fontSize: TYPOGRAPHY.bodyXS,
                        fontWeight: '700',
                        color: gender === g.value ? colors.backgroundPrimary : colors.textPrimary,
                      }}>
                        {g.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Goal */}
              <View style={{ marginBottom: DIMENSIONS.SPACING * 1.5 }}>
                <Text style={labelStyle}>{t('settings.goal')}</Text>
                <View style={{ gap: DIMENSIONS.SPACING * 0.5 }}>
                  {goals.map((g) => (
                    <TouchableOpacity
                      key={g.value}
                      onPress={() => setGoal(g.value)}
                      style={{
                        paddingVertical: DIMENSIONS.SPACING * 0.8,
                        paddingHorizontal: DIMENSIONS.SPACING,
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: goal === g.value ? colors.textPrimary : colors.cardBackgroundSecondary,
                        borderWidth: 2,
                        borderColor: goal === g.value ? colors.textPrimary : colors.borderSecondary,
                      }}
                    >
                      <Text style={{
                        fontSize: TYPOGRAPHY.bodyS,
                        fontWeight: '700',
                        color: goal === g.value ? colors.backgroundPrimary : colors.textPrimary,
                      }}>
                        {g.label}
                      </Text>
                      {goal === g.value && (
                        <Ionicons name="checkmark" size={18} color={colors.backgroundPrimary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Buttons */}
              <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.6 }}>
                <TouchableOpacity
                  onPress={onCancel}
                  style={{
                    flex: 1, paddingVertical: DIMENSIONS.SPACING * 0.9,
                    borderRadius: 14, alignItems: 'center',
                    backgroundColor: colors.cardBackgroundSecondary,
                    borderWidth: 2, borderColor: colors.borderSecondary,
                  }}
                >
                  <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.textPrimary }}>
                    {t('settings.cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1, paddingVertical: DIMENSIONS.SPACING * 0.9,
                    borderRadius: 14, alignItems: 'center',
                    backgroundColor: colors.textPrimary,
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.backgroundPrimary }}>
                    {saving ? '...' : t('common.save')}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
