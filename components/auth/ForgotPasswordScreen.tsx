import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  isLoading: boolean;
  onReset: (code: string, newPassword: string) => void;
  onBack: () => void;
}

export default function ForgotPasswordScreen({ isLoading, onReset, onBack }: Props) {
  const { t } = useTranslation();
  const colors = useTheme();
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const newPasswordRef = useRef<TextInput>(null);

  const ready = resetCode.length === 6 && newPassword.length >= 8;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={onBack}
            style={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingTop: DIMENSIONS.SPACING * 0.8, alignSelf: 'flex-start' }}
          >
            <Ionicons name="arrow-back" size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={{
            flex: 1, justifyContent: 'center',
            paddingHorizontal: DIMENSIONS.CARD_PADDING * 1.5,
            paddingBottom: DIMENSIONS.SPACING * 2,
          }}>
            <View style={{ alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 1.5 }}>
              <View style={{
                width: DIMENSIONS.SCREEN_WIDTH * 0.18, height: DIMENSIONS.SCREEN_WIDTH * 0.18,
                borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.045,
                backgroundColor: colors.textPrimary,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: DIMENSIONS.SPACING * 0.8,
              }}>
                <Ionicons name="lock-closed-outline" size={TYPOGRAPHY.iconM} color={colors.backgroundPrimary} />
              </View>
              <Text style={{
                fontSize: TYPOGRAPHY.titleS, fontWeight: '900',
                color: colors.textPrimary, marginBottom: DIMENSIONS.SPACING * 0.3, letterSpacing: -0.5,
              }}>
                {t('auth.resetPassword')}
              </Text>
              <Text style={{ fontSize: TYPOGRAPHY.bodyS, color: colors.textPrimary, opacity: 0.5, textAlign: 'center' }}>
                {t('auth.resetPasswordSent')}
              </Text>
            </View>

            <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textPrimary, opacity: 0.6, marginBottom: DIMENSIONS.SPACING * 0.3, textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('auth.verificationCode')}
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.cardBackground, borderRadius: 14,
                padding: DIMENSIONS.SPACING * 0.8, color: colors.textPrimary,
                fontSize: TYPOGRAPHY.titleS, fontWeight: '900',
                borderWidth: 2, borderColor: resetCode.length === 6 ? colors.textPrimary : colors.borderPrimary,
                marginBottom: DIMENSIONS.SPACING, textAlign: 'center', letterSpacing: 10,
              }}
              placeholder="— — — — — —"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              value={resetCode}
              onChangeText={(text) => { setResetCode(text); if (text.length === 6) newPasswordRef.current?.focus(); }}
              maxLength={6}
              returnKeyType="next"
              onSubmitEditing={() => newPasswordRef.current?.focus()}
            />

            <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textPrimary, opacity: 0.6, marginBottom: DIMENSIONS.SPACING * 0.3, textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('auth.newPassword')}
            </Text>
            <View style={{ position: 'relative', marginBottom: DIMENSIONS.SPACING * 1.2 }}>
              <TextInput
                ref={newPasswordRef}
                style={{
                  backgroundColor: colors.cardBackground, borderRadius: 14,
                  padding: DIMENSIONS.SPACING * 0.8, paddingRight: DIMENSIONS.SPACING * 2.5,
                  color: colors.textPrimary, fontSize: TYPOGRAPHY.bodyS, fontWeight: '600',
                  borderWidth: 2, borderColor: colors.borderPrimary,
                }}
                placeholder={t('auth.passwordPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                returnKeyType="done"
                onSubmitEditing={() => ready && onReset(resetCode, newPassword)}
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={{ position: 'absolute', right: DIMENSIONS.SPACING * 0.9, top: DIMENSIONS.SPACING * 0.85 }}
              >
                <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={TYPOGRAPHY.iconXS} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => onReset(resetCode, newPassword)}
              disabled={isLoading || !ready}
              style={{
                borderRadius: 16, paddingVertical: DIMENSIONS.SPACING * 0.7,
                backgroundColor: ready ? colors.textPrimary : colors.cardBackground,
                alignItems: 'center',
                borderWidth: !ready ? 1.5 : 0,
                borderColor: colors.borderPrimary,
              }}
            >
              {isLoading
                ? <ActivityIndicator color={colors.backgroundPrimary} />
                : <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '900', color: ready ? colors.backgroundPrimary : colors.textSecondary }}>
                  {t('auth.ok')}
                </Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
