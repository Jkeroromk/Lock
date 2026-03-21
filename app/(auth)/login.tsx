import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { signIn, signUp, signInAnonymously, resetPassword } from '@/services/auth';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setUser } = useStore();
  const colors = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert(t('auth.error'), t('auth.fillAllFields'));
      return;
    }

    if (password.length < 6) {
      Alert.alert(t('auth.error'), t('auth.passwordTooShort'));
      return;
    }

    setIsLoading(true);

    try {
      const result = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);

      if (!result.success) {
        Alert.alert(t('auth.error'), result.error || t('auth.loginFailed'));
        return;
      }

      if (isSignUp && !result.session) {
        // 注册成功但需要邮箱验证
        Alert.alert(
          t('auth.checkEmail'),
          t('auth.verificationSent'),
          [{ text: t('auth.ok'), onPress: () => setIsSignUp(false) }]
        );
        return;
      }

      const supabaseUser = result.user;
      const { setHasSelectedLanguage } = useStore.getState();
      setHasSelectedLanguage(false);
      setUser({
        id: supabaseUser?.id || '',
        name: supabaseUser?.user_metadata?.name || email.split('@')[0] || 'User',
        email: email,
        hasCompletedOnboarding: false,
      });

      router.replace('/(auth)/language-selection');
    } catch (error) {
      Alert.alert(t('auth.error'), t('auth.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signInAnonymously();

      if (!result.success) {
        Alert.alert(t('auth.error'), result.error || t('auth.loginFailed'));
        return;
      }

      const { setHasSelectedLanguage } = useStore.getState();
      setHasSelectedLanguage(false);
      setUser({
        id: result.user?.id || '',
        name: 'Guest',
        email: '',
        hasCompletedOnboarding: false,
      });
      router.replace('/(auth)/language-selection');
    } catch (error) {
      Alert.alert(t('auth.error'), t('auth.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert(t('auth.error'), t('auth.enterEmailFirst'));
      return;
    }

    const result = await resetPassword(email);
    if (result.success) {
      Alert.alert(t('auth.checkEmail'), t('auth.resetPasswordSent'));
    } else {
      Alert.alert(t('auth.error'), result.error || t('auth.resetFailed'));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: DIMENSIONS.CARD_PADDING }}>
          {/* Logo/Title */}
          <View style={{ alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 2 }}>
            <View
              style={{
                width: DIMENSIONS.SCREEN_WIDTH * 0.14,
                height: DIMENSIONS.SCREEN_WIDTH * 0.14,
                borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.07,
                backgroundColor: colors.textPrimary,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: DIMENSIONS.SPACING * 0.8,
              }}
            >
              <Text
                style={{
                  fontSize: TYPOGRAPHY.titleL,
                  fontWeight: '900',
                  color: colors.backgroundPrimary,
                }}
              >
                L
              </Text>
            </View>
            <Text
              style={{
                fontSize: TYPOGRAPHY.titleL,
                fontWeight: '900',
                color: colors.textPrimary,
                marginBottom: DIMENSIONS.SPACING * 0.3,
              }}
            >
              Lock
            </Text>
            <Text
              style={{
                fontSize: TYPOGRAPHY.bodyS,
                fontWeight: '500',
                color: colors.textPrimary,
                opacity: 0.7,
              }}
            >
              {t('auth.welcome')}
            </Text>
          </View>

          {/* Login Form */}
          <View style={{ marginBottom: DIMENSIONS.SPACING * 1.2 }}>
            <View style={{ marginBottom: DIMENSIONS.SPACING * 0.8 }}>
              <Text
                style={{
                  fontSize: TYPOGRAPHY.bodyXS,
                  fontWeight: '700',
                  color: colors.textPrimary,
                  marginBottom: DIMENSIONS.SPACING * 0.3,
                }}
              >
                {t('auth.email')}
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.cardBackground,
                  borderRadius: 12,
                  padding: DIMENSIONS.SPACING * 0.9,
                  color: colors.textPrimary,
                  fontSize: TYPOGRAPHY.bodyS,
                  fontWeight: '600',
                  borderWidth: 1.5,
                  borderColor: colors.borderPrimary,
                }}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={{ marginBottom: DIMENSIONS.SPACING * 0.4 }}>
              <Text
                style={{
                  fontSize: TYPOGRAPHY.bodyXS,
                  fontWeight: '700',
                  color: colors.textPrimary,
                  marginBottom: DIMENSIONS.SPACING * 0.3,
                }}
              >
                {t('auth.password')}
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={{
                    backgroundColor: colors.cardBackground,
                    borderRadius: 12,
                    padding: DIMENSIONS.SPACING * 0.9,
                    paddingRight: DIMENSIONS.SPACING * 3,
                    color: colors.textPrimary,
                    fontSize: TYPOGRAPHY.bodyS,
                    fontWeight: '600',
                    borderWidth: 1.5,
                    borderColor: colors.borderPrimary,
                  }}
                  placeholder={t('auth.passwordPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: DIMENSIONS.SPACING * 0.9,
                    top: DIMENSIONS.SPACING * 0.9,
                  }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={TYPOGRAPHY.iconXS}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            {!isSignUp && (
              <TouchableOpacity
                onPress={handleForgotPassword}
                style={{ alignSelf: 'flex-end', marginBottom: DIMENSIONS.SPACING * 0.8 }}
              >
                <Text
                  style={{
                    fontSize: TYPOGRAPHY.bodyXXS,
                    fontWeight: '600',
                    color: colors.textPrimary,
                    opacity: 0.6,
                  }}
                >
                  {t('auth.forgotPassword')}
                </Text>
              </TouchableOpacity>
            )}

            {isSignUp && <View style={{ marginBottom: DIMENSIONS.SPACING * 0.8 }} />}

            <TouchableOpacity
              onPress={handleAuth}
              disabled={isLoading}
              style={{
                borderRadius: 16,
                paddingVertical: DIMENSIONS.SPACING * 0.9,
                backgroundColor: colors.textPrimary,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: DIMENSIONS.SPACING * 0.8,
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.backgroundPrimary} size="small" />
              ) : (
                <Text
                  style={{
                    fontSize: TYPOGRAPHY.bodyS,
                    fontWeight: '900',
                    color: colors.backgroundPrimary,
                  }}
                >
                  {isSignUp ? t('auth.signUp') : t('auth.login')}
                </Text>
              )}
            </TouchableOpacity>

            {/* Toggle Login/SignUp */}
            <TouchableOpacity
              onPress={() => setIsSignUp(!isSignUp)}
              style={{ alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 0.8 }}
            >
              <Text
                style={{
                  fontSize: TYPOGRAPHY.bodyXXS,
                  fontWeight: '600',
                  color: colors.textPrimary,
                  opacity: 0.7,
                }}
              >
                {isSignUp ? t('auth.hasAccount') : t('auth.noAccount')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleGuestLogin}
              disabled={isLoading}
              style={{
                borderRadius: 16,
                paddingVertical: DIMENSIONS.SPACING * 0.8,
                backgroundColor: colors.cardBackground,
                borderWidth: 1.5,
                borderColor: colors.borderPrimary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: TYPOGRAPHY.bodyS,
                  fontWeight: '700',
                  color: colors.textPrimary,
                }}
              >
                {t('auth.continueAsGuest')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Social Login Options */}
          <View style={{ alignItems: 'center' }}>
            <Text
              style={{
                fontSize: TYPOGRAPHY.bodyXXS,
                fontWeight: '600',
                color: colors.textPrimary,
                opacity: 0.5,
                marginBottom: DIMENSIONS.SPACING * 0.8,
              }}
            >
              {t('auth.orContinueWith')}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: DIMENSIONS.SPACING * 0.6 }}>
              <TouchableOpacity
                onPress={() => Alert.alert('Apple Sign In', t('auth.socialLoginComingSoon'))}
                style={{
                  width: DIMENSIONS.SCREEN_WIDTH * 0.1,
                  height: DIMENSIONS.SCREEN_WIDTH * 0.1,
                  borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.05,
                  backgroundColor: colors.cardBackground,
                  borderWidth: 1.5,
                  borderColor: colors.borderPrimary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="logo-apple" size={TYPOGRAPHY.iconM} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Alert.alert('Google Sign In', t('auth.socialLoginComingSoon'))}
                style={{
                  width: DIMENSIONS.SCREEN_WIDTH * 0.1,
                  height: DIMENSIONS.SCREEN_WIDTH * 0.1,
                  borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.05,
                  backgroundColor: colors.cardBackground,
                  borderWidth: 1.5,
                  borderColor: colors.borderPrimary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="logo-google" size={TYPOGRAPHY.iconM} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
