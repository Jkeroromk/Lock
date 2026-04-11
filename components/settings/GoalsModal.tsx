import { View, Text, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { updateProfile } from '@/services/api';
import type { Goal, ExerciseFrequency } from '@/store/useStore';

interface User {
  height?: number;
  age?: number;
  weight?: number;
  gender?: string;
  goal?: Goal;
  exerciseFrequency?: ExerciseFrequency;
}

interface GoalsModalProps {
  visible: boolean;
  user: User | null;
  dailyCalorieGoal: number;
  dailyStepGoal: number;
  onSave: (goals: { dailyCalorieGoal: number; dailyStepGoal: number }, body: Partial<User>) => void;
  onCancel: () => void;
}

const FITNESS_GOAL_VALUES: { value: Goal; icon: string }[] = [
  { value: 'lose_weight', icon: 'trending-down' },
  { value: 'lose_fat', icon: 'flame' },
  { value: 'gain_muscle', icon: 'barbell' },
];

const EXERCISE_FREQ_VALUES: ExerciseFrequency[] = ['never', 'rarely', '1-2', '3-4', '5-6', 'daily'];

const ACTIVITY_MULTIPLIER: Record<string, number> = {
  never: 1.2, rarely: 1.375, '1-2': 1.375, '3-4': 1.55, '5-6': 1.725, daily: 1.9,
};
const GOAL_ADJUSTMENT: Record<string, number> = {
  lose_weight: -500, lose_fat: -300, gain_muscle: 300,
};
const RECOMMENDED_STEPS: Record<string, number> = {
  never: 6000, rarely: 7000, '1-2': 8000, '3-4': 10000, '5-6': 12000, daily: 15000,
};

function calcRecommended(
  w: string, h: string, a: string,
  gender: string | undefined,
  freq: string, goalVal: string,
): { calories: number; steps: number } | null {
  const weight = parseFloat(w);
  const height = parseFloat(h);
  const age = parseInt(a);
  if (!weight || !height || !age) return null;

  const bmrM = 10 * weight + 6.25 * height - 5 * age + 5;
  const bmrF = 10 * weight + 6.25 * height - 5 * age - 161;
  const bmr = gender === 'male' ? bmrM : gender === 'female' ? bmrF : (bmrM + bmrF) / 2;

  const tdee = bmr * (ACTIVITY_MULTIPLIER[freq] || 1.375);
  const adjustment = GOAL_ADJUSTMENT[goalVal] || 0;
  const recommended = Math.round(tdee + adjustment);
  const steps = RECOMMENDED_STEPS[freq] || 8000;
  return { calories: recommended, steps };
}

export default function GoalsModal({ visible, user, dailyCalorieGoal, dailyStepGoal, onSave, onCancel }: GoalsModalProps) {
  const { t } = useTranslation();
  const colors = useTheme();

  const [calories, setCalories] = useState('');
  const [steps, setSteps] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [goal, setGoal] = useState<Goal | ''>('');
  const [exerciseFreq, setExerciseFreq] = useState<ExerciseFrequency | ''>('');
  const [saving, setSaving] = useState(false);

  const recommended = calcRecommended(weight, height, age, user?.gender, exerciseFreq, goal);

  useEffect(() => {
    if (visible) {
      setCalories(String(dailyCalorieGoal));
      setSteps(String(dailyStepGoal));
      setHeight(user?.height ? String(user.height) : '');
      setWeight(user?.weight ? String(user.weight) : '');
      setAge(user?.age ? String(user.age) : '');
      setGoal(user?.goal || '');
      setExerciseFreq(user?.exerciseFrequency || '');
    }
  }, [visible, user, dailyCalorieGoal, dailyStepGoal]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Partial<User> = {
        height: height ? parseInt(height) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        age: age ? parseInt(age) : undefined,
        goal: goal || undefined,
        exerciseFrequency: exerciseFreq || undefined,
      };
      await updateProfile({ ...body });
      onSave(
        { dailyCalorieGoal: parseInt(calories) || 2000, dailyStepGoal: parseInt(steps) || 10000 },
        body,
      );
    } catch (err: any) {
      // still save local goals even if API fails
      onSave(
        { dailyCalorieGoal: parseInt(calories) || 2000, dailyStepGoal: parseInt(steps) || 10000 },
        {},
      );
    } finally {
      setSaving(false);
    }
  };

  const sectionLabel = (text: string) => (
    <Text style={{
      fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textSecondary,
      textTransform: 'uppercase', letterSpacing: 1,
      marginBottom: DIMENSIONS.SPACING * 0.6, marginTop: DIMENSIONS.SPACING * 1.2,
    }}>
      {text}
    </Text>
  );

  const inputStyle = {
    flex: 1, padding: DIMENSIONS.SPACING * 0.85, backgroundColor: colors.cardBackground,
    borderRadius: 14, color: colors.textPrimary, fontSize: TYPOGRAPHY.bodyM,
    fontWeight: '600' as const, borderWidth: 2, borderColor: colors.borderPrimary,
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{
            backgroundColor: colors.backgroundPrimary,
            borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '92%',
            borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: colors.borderPrimary,
          }}>
            <View style={{ alignItems: 'center', paddingTop: DIMENSIONS.SPACING * 0.8 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderPrimary }} />
            </View>
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingVertical: DIMENSIONS.SPACING,
            }}>
              <Text style={{ fontSize: TYPOGRAPHY.title, fontWeight: '900', color: colors.textPrimary }}>
                {t('settings.editGoals')}
              </Text>
              <TouchableOpacity onPress={onCancel} style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: colors.cardBackgroundSecondary,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: colors.borderPrimary,
              }}>
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingBottom: 40 }}>

              {/* Daily goals */}
              {sectionLabel(t('settings.goals'))}
              <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.6 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary, fontWeight: '600', marginBottom: 4 }}>{t('settings.dailyCalories')}</Text>
                  <TextInput style={inputStyle} placeholder={t('settings.dailyCaloriesPlaceholder')} placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={calories} onChangeText={setCalories} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary, fontWeight: '600', marginBottom: 4 }}>{t('settings.dailySteps')}</Text>
                  <TextInput style={inputStyle} placeholder={t('settings.dailyStepsPlaceholder')} placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={steps} onChangeText={setSteps} />
                </View>
              </View>
              {recommended && (
                <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.5, marginTop: DIMENSIONS.SPACING * 0.6 }}>
                  <TouchableOpacity
                    onPress={() => setCalories(String(recommended.calories))}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: DIMENSIONS.SPACING * 0.7, paddingVertical: DIMENSIONS.SPACING * 0.35, borderRadius: 20, backgroundColor: colors.cardBackgroundSecondary, borderWidth: 1, borderColor: colors.borderPrimary }}
                  >
                    <Ionicons name="sparkles" size={11} color={colors.textSecondary} />
                    <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary }}>{recommended.calories} {t('settings.kcalPerDay')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSteps(String(recommended.steps))}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: DIMENSIONS.SPACING * 0.7, paddingVertical: DIMENSIONS.SPACING * 0.35, borderRadius: 20, backgroundColor: colors.cardBackgroundSecondary, borderWidth: 1, borderColor: colors.borderPrimary }}
                  >
                    <Ionicons name="sparkles" size={11} color={colors.textSecondary} />
                    <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary }}>{recommended.steps.toLocaleString()} {t('settings.stepsPerDay')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Body stats */}
              {sectionLabel(t('settings.profileInfo'))}
              <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.6, marginBottom: DIMENSIONS.SPACING * 0.8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary, fontWeight: '600', marginBottom: 4 }}>{t('settings.height')} (cm)</Text>
                  <TextInput style={inputStyle} placeholder="170" placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={height} onChangeText={setHeight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary, fontWeight: '600', marginBottom: 4 }}>{t('settings.weight')} (kg)</Text>
                  <TextInput style={inputStyle} placeholder="65" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" value={weight} onChangeText={setWeight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary, fontWeight: '600', marginBottom: 4 }}>{t('settings.age')}</Text>
                  <TextInput style={inputStyle} placeholder="25" placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={age} onChangeText={setAge} />
                </View>
              </View>

              {/* Fitness goal */}
              {sectionLabel(t('settings.goal'))}
              <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.5 }}>
                {FITNESS_GOAL_VALUES.map((g) => (
                  <TouchableOpacity key={g.value} onPress={() => setGoal(g.value)} style={{
                    flex: 1, paddingVertical: DIMENSIONS.SPACING * 0.8, borderRadius: 14, alignItems: 'center',
                    backgroundColor: goal === g.value ? colors.textPrimary : colors.cardBackground,
                    borderWidth: 2, borderColor: goal === g.value ? colors.textPrimary : colors.borderPrimary,
                    gap: 4,
                  }}>
                    <Ionicons name={g.icon as any} size={TYPOGRAPHY.iconXS} color={goal === g.value ? colors.backgroundPrimary : colors.textPrimary} />
                    <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '900', color: goal === g.value ? colors.backgroundPrimary : colors.textPrimary }}>
                      {t(`settings.goalOptions.${g.value}` as any)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Exercise frequency */}
              {sectionLabel(t('onboarding.exerciseFrequencyTitle'))}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: DIMENSIONS.SPACING * 0.5, marginBottom: DIMENSIONS.SPACING * 1.5 }}>
                {EXERCISE_FREQ_VALUES.map((val) => (
                  <TouchableOpacity key={val} onPress={() => setExerciseFreq(val)} style={{
                    paddingHorizontal: DIMENSIONS.SPACING * 0.9, paddingVertical: DIMENSIONS.SPACING * 0.5,
                    borderRadius: 20, borderWidth: 2,
                    backgroundColor: exerciseFreq === val ? colors.textPrimary : colors.cardBackground,
                    borderColor: exerciseFreq === val ? colors.textPrimary : colors.borderPrimary,
                  }}>
                    <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: exerciseFreq === val ? colors.backgroundPrimary : colors.textPrimary }}>
                      {t(`onboarding.exerciseFrequency.${val}` as any)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Buttons */}
              <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.6 }}>
                <TouchableOpacity onPress={onCancel} style={{
                  flex: 1, paddingVertical: DIMENSIONS.SPACING * 0.9, borderRadius: 14, alignItems: 'center',
                  backgroundColor: colors.cardBackground, borderWidth: 2, borderColor: colors.borderPrimary,
                }}>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.textPrimary }}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={{
                  flex: 1, paddingVertical: DIMENSIONS.SPACING * 0.9, borderRadius: 14, alignItems: 'center',
                  backgroundColor: colors.textPrimary, opacity: saving ? 0.6 : 1,
                }}>
                  {saving ? <ActivityIndicator color={colors.backgroundPrimary} /> : (
                    <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.backgroundPrimary }}>{t('common.save')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
