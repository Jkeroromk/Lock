import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

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
                <Ionicons name="mail-outline" size={TYPOGRAPHY.iconM} color={colors.backgroundPrimary} />
              </View>
              <Text style={{
                fontSize: TYPOGRAPHY.titleS, fontWeight: '900',
                color: colors.textPrimary, marginBottom: DIMENSIONS.SPACING * 0.3, letterSpacing: -0.5,
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
                  borderRadius: 14, backgroundColor: colors.cardBackground,
                  borderWidth: 2,
                  borderColor: codeDigits[i] ? colors.textPrimary : colors.borderPrimary,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <TextInput
                    ref={(r) => { codeRefs.current[i] = r; }}
                    style={{
                      width: '100%', height: '100%', textAlign: 'center',
                      fontSize: TYPOGRAPHY.titleS, fontWeight: '900', color: colors.textPrimary,
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

            <TouchableOpacity
              onPress={() => onVerify(currentCode)}
              disabled={isLoading || currentCode.length < 6}
              style={{
                borderRadius: 16, paddingVertical: DIMENSIONS.SPACING * 0.7,
                backgroundColor: currentCode.length === 6 ? colors.textPrimary : colors.cardBackground,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: currentCode.length < 6 ? 1.5 : 0,
                borderColor: colors.borderPrimary, marginBottom: DIMENSIONS.SPACING * 0.8,
              }}
            >
              {isLoading
                ? <ActivityIndicator color={currentCode.length === 6 ? colors.backgroundPrimary : colors.textPrimary} />
                : <Text style={{
                  fontSize: TYPOGRAPHY.bodyS, fontWeight: '900',
                  color: currentCode.length === 6 ? colors.backgroundPrimary : colors.textSecondary,
                }}>
                  {t('auth.verify')}
                </Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { onResend(); setCodeDigits(['', '', '', '', '', '']); codeRefs.current[0]?.focus(); }}
              style={{ alignItems: 'center' }}
            >
              <Text style={{ fontSize: TYPOGRAPHY.bodyXS, color: colors.textPrimary, opacity: 0.5, fontWeight: '600' }}>
                {t('auth.resendCode')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
