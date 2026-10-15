import { View, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput } from '@/components/ui/Text';
import type { TextInput as RNTextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { FONTS } from '@/constants/fonts';
import { Button } from '@/components/ui/bxc';

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
  const newPasswordRef = useRef<RNTextInput>(null);

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
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={{ width: 44, height: 44, marginLeft: 10, marginTop: 4, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={{
            flex: 1, justifyContent: 'center',
            paddingHorizontal: DIMENSIONS.CARD_PADDING * 1.5,
            paddingBottom: DIMENSIONS.SPACING * 2,
          }}>
            <View style={{ alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 1.5 }}>
              <View style={{
                width: 72, height: 72, borderRadius: 22, backgroundColor: colors.accent,
                borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center',
                marginBottom: 18, transform: [{ rotate: '-4deg' }],
              }}>
                <Ionicons name="lock-closed-outline" size={32} color={colors.onAccent} />
              </View>
              <Text style={{
                fontSize: 34, fontWeight: '800',
                color: colors.textPrimary, marginBottom: 8, letterSpacing: -1.2,
              }}>
                {t('auth.resetPassword')}
              </Text>
              <Text style={{ fontSize: TYPOGRAPHY.bodyS, color: colors.textPrimary, opacity: 0.5, textAlign: 'center' }}>
                {t('auth.resetPasswordSent')}
              </Text>
            </View>

            <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase' }}>
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

            <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase' }}>
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
                accessibilityRole="button"
                accessibilityLabel={showNewPassword ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: 4, top: 0, bottom: 0, width: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={TYPOGRAPHY.iconXS} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Button
              label={t('auth.ok')}
              loading={isLoading}
              disabled={!ready}
              onPress={() => onReset(resetCode, newPassword)}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
