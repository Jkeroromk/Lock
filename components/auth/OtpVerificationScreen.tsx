import { View, TouchableOpacity, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Text, TextInput } from '@/components/ui/Text';
import type { TextInput as RNTextInput } from 'react-native';
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
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<RNTextInput | null>(null);
  const currentCode = code;

  // Pull a 6-digit code out of whatever was copied (e.g. the whole email line).
  const pasteCode = async () => {
    const text = await Clipboard.getStringAsync().catch(() => '');
    const match = (text || '').match(/\d{6}/);
    if (!match) return;
    setCode(match[0]);
    onVerify(match[0]);
  };

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

            {/* OTP: one real input (so iOS can AutoFill the code from Mail/Messages and
                paste works), drawn as six boxes. */}
            <Pressable
              onPress={() => inputRef.current?.focus()}
              accessibilityRole="none"
              style={{ marginBottom: 10 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: DIMENSIONS.SPACING * 0.4 }}>
                {[0, 1, 2, 3, 4, 5].map((i) => {
                  const digit = code[i] ?? '';
                  const active = focused && (i === code.length || (i === 5 && code.length === 6));
                  return (
                    <View key={i} style={{
                      width: DIMENSIONS.SCREEN_WIDTH * 0.12, height: DIMENSIONS.SCREEN_WIDTH * 0.15,
                      borderRadius: 14, borderWidth: active ? 3 : 2,
                      borderColor: digit || active ? colors.textPrimary : colors.borderPrimary,
                      backgroundColor: digit ? colors.accent : colors.cardBackground,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 26, fontWeight: '800', color: digit ? colors.onAccent : colors.textPrimary }}>{digit}</Text>
                    </View>
                  );
                })}
              </View>
              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={(raw) => {
                  const next = raw.replace(/\D/g, '').slice(0, 6);
                  setCode(next);
                  if (next.length === 6) onVerify(next);
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                caretHidden
                accessibilityLabel={t('auth.verificationCode' as any)}
                // Covers the boxes: taps focus it and long-press shows Paste.
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, color: 'transparent', fontSize: 1 }}
              />
            </Pressable>

            <TouchableOpacity
              onPress={pasteCode}
              accessibilityRole="button"
              style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 12, marginBottom: DIMENSIONS.SPACING * 0.6 }}
            >
              <Ionicons name="clipboard-outline" size={17} color={colors.textPrimary} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{t('auth.pasteCode' as any)}</Text>
            </TouchableOpacity>

            <Button
              label={t('auth.verify')}
              loading={isLoading}
              disabled={currentCode.length < 6}
              onPress={() => onVerify(currentCode)}
              style={{ marginBottom: 6 }}
            />

            <TouchableOpacity
              onPress={() => { onResend(); setCode(''); inputRef.current?.focus(); }}
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
