import { View, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/bxc';

interface Props {
  email: string;
  isLoading: boolean;
  onVerify: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
}

export default function OtpVerificationScreen({ email, isLoading, onVerify, onResend, onBack }: Props) {
  const { t } = useTranslation();
  const colors = useTheme();
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
  const codeRefs = useRef<(TextInput | null)[]>([null, null, null, null, null, null]);
  const currentCode = codeDigits.join('');

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
                <Ionicons name="mail-outline" size={32} color={colors.onAccent} />
              </View>
              <Text style={{
                fontSize: 34, fontWeight: '800',
                color: colors.textPrimary, marginBottom: 8, letterSpacing: -1.2,
              }}>
                {t('auth.checkEmail')}
              </Text>
              <Text style={{
                fontSize: TYPOGRAPHY.bodyS, color: colors.textPrimary,
                opacity: 0.5, textAlign: 'center', lineHeight: TYPOGRAPHY.bodyS * 1.6,
              }}>
                {t('auth.verificationSentTo')}{'\n'}
                <Text style={{ fontWeight: '700', opacity: 1 }}>{email}</Text>
              </Text>
            </View>

            {/* OTP Boxes */}
            <View style={{
              flexDirection: 'row', justifyContent: 'center',
              gap: DIMENSIONS.SPACING * 0.4, marginBottom: DIMENSIONS.SPACING * 1.5,
            }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={{
                  width: DIMENSIONS.SCREEN_WIDTH * 0.12, height: DIMENSIONS.SCREEN_WIDTH * 0.15,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: codeDigits[i] ? colors.textPrimary : colors.borderPrimary,
                  backgroundColor: codeDigits[i] ? colors.accent : colors.cardBackground,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <TextInput
                    ref={(r) => { codeRefs.current[i] = r; }}
                    style={{
                      width: '100%', height: '100%', textAlign: 'center',
                      fontSize: 26, fontWeight: '800', color: codeDigits[i] ? colors.onAccent : colors.textPrimary,
                    }}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={codeDigits[i]}
                    onChangeText={(val) => {
                      const digit = val.replace(/[^0-9]/g, '').slice(-1);
                      const next = [...codeDigits];
                      next[i] = digit;
                      setCodeDigits(next);
                      if (digit && i < 5) codeRefs.current[i + 1]?.focus();
                      if (next.every(d => d !== '')) onVerify(next.join(''));
                    }}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === 'Backspace' && !codeDigits[i] && i > 0) {
                        const next = [...codeDigits];
                        next[i - 1] = '';
                        setCodeDigits(next);
                        codeRefs.current[i - 1]?.focus();
                      }
                    }}
                  />
                </View>
              ))}
            </View>

            <Button
              label={t('auth.verify')}
              loading={isLoading}
              disabled={currentCode.length < 6}
              onPress={() => onVerify(currentCode)}
              style={{ marginBottom: 6 }}
            />

            <TouchableOpacity
              onPress={() => { onResend(); setCodeDigits(['', '', '', '', '', '']); codeRefs.current[0]?.focus(); }}
              accessibilityRole="button"
              style={{ alignItems: 'center', justifyContent: 'center', minHeight: 44 }}
            >
              <Text style={{ fontSize: 14, color: colors.textPrimary, fontWeight: '700' }}>
                {t('auth.resendCode')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
