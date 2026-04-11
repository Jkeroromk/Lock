import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSignIn, useSignUp, useOAuth, useAuth } from '@clerk/clerk-expo';
import { setTokenGetter } from '@/services/tokenStore';
import * as Linking from 'expo-linking';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { fetchProfile } from '@/services/api';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setUser } = useStore();
  const colors = useTheme();

  const { getToken } = useAuth();
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const { startOAuthFlow: googleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: appleOAuth } = useOAuth({ strategy: 'oauth_apple' });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingPasswordReset, setPendingPasswordReset] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const newPasswordRef = useRef<TextInput>(null);

  // After Clerk auth succeeds — load profile from our DB and route
  const onAuthSuccess = async () => {
    try {
      const profile = await fetchProfile();
      setUser({
        id: profile.id,
        name: profile.name || email.split('@')[0] || 'User',
        email: profile.email || email,
        username: profile.username ?? undefined,
        bio: profile.bio ?? undefined,
        avatarEmoji: profile.avatarEmoji ?? undefined,
        showGender: profile.showGender ?? false,
        height: profile.height ?? undefined,
        age: profile.age ?? undefined,
        weight: profile.weight ?? undefined,
        gender: profile.gender as any,
        goal: profile.goal as any,
        exerciseFrequency: profile.exerciseFrequency as any,
        expectedTimeframe: profile.expectedTimeframe as any,
        plan: (profile.plan ?? 'FREE') as any,
        streak: profile.streak ?? 0,
        hasCompletedOnboarding: profile.hasCompletedOnboarding,
      });
      if (profile.hasCompletedOnboarding) {
        router.replace('/(tabs)/today');
      } else {
        const { setHasSelectedLanguage } = useStore.getState();
        setHasSelectedLanguage(false);
        router.replace('/(auth)/language-selection');
      }
    } catch {
      router.replace('/(auth)/language-selection');
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert(t('auth.error'), t('auth.fillAllFields'));
      return;
    }
    if (password.length < 8) {
      Alert.alert(t('auth.error'), t('auth.passwordTooShort'));
      return;
    }
    if (!signInLoaded || !signUpLoaded) return;

    setIsLoading(true);
    try {
      if (isSignUp) {
        const result = await signUp.create({ emailAddress: email, password });
        await result.prepareEmailAddressVerification({ strategy: 'email_code' });
        setPendingVerification(true);
      } else {
        const result = await signIn.create({ identifier: email, password });
        await setSignInActive({ session: result.createdSessionId });
        setTokenGetter(getToken);
        await onAuthSuccess();
      }
    } catch (err: any) {
      Alert.alert(t('auth.error'), err.errors?.[0]?.longMessage || t('auth.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!signUpLoaded) return;
    setIsLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: verificationCode });
      await setSignUpActive({ session: result.createdSessionId });
      setTokenGetter(getToken);
      await onAuthSuccess();
    } catch (err: any) {
      Alert.alert(t('auth.error'), err.errors?.[0]?.longMessage || t('auth.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { createdSessionId, setActive } = await googleOAuth({
        redirectUrl: Linking.createURL('/', { scheme: 'lock' }),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        setTokenGetter(getToken);
        await onAuthSuccess();
      }
    } catch (err: any) {
      if (err.message !== 'cancelled') {
        Alert.alert(t('auth.error'), t('auth.loginFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    if (Platform.OS !== 'ios') return;
    setIsLoading(true);
    try {
      const { createdSessionId, setActive } = await appleOAuth({
        redirectUrl: Linking.createURL('/', { scheme: 'lock' }),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        setTokenGetter(getToken);
        await onAuthSuccess();
      }
    } catch (err: any) {
      if (err.message !== 'cancelled') {
        Alert.alert(t('auth.error'), t('auth.loginFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert(t('auth.error'), t('auth.enterEmailFirst'));
      return;
    }
    if (!signInLoaded) return;
    try {
      await signIn.create({ strategy: 'reset_password_email_code', identifier: email });
      setResetCode('');
      setNewPassword('');
      setPendingPasswordReset(true);
    } catch (err: any) {
      Alert.alert(t('auth.error'), err.errors?.[0]?.longMessage || t('auth.resetFailed'));
    }
  };

  const handlePasswordReset = async () => {
    if (!signInLoaded) return;
    if (resetCode.length < 6) {
      Alert.alert(t('auth.error'), t('auth.enterCode'));
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert(t('auth.error'), t('auth.passwordTooShort'));
      return;
    }
    setIsLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: resetCode,
      });
      if (result.status === 'needs_new_password') {
        const resetResult = await signIn.resetPassword({ password: newPassword });
        if (resetResult.status === 'complete') {
          await setSignInActive({ session: resetResult.createdSessionId });
          setTokenGetter(getToken);
          setPendingPasswordReset(false);
          await onAuthSuccess();
        }
      }
    } catch (err: any) {
      Alert.alert(t('auth.error'), err.errors?.[0]?.longMessage || t('auth.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Password reset step
  if (pendingPasswordReset) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: DIMENSIONS.CARD_PADDING }}>
          <Text style={{ fontSize: TYPOGRAPHY.titleL, fontWeight: '900', color: colors.textPrimary, marginBottom: DIMENSIONS.SPACING * 0.3 }}>
            {t('auth.resetPassword')}
          </Text>
          <Text style={{ fontSize: TYPOGRAPHY.bodyS, color: colors.textPrimary, opacity: 0.6, marginBottom: DIMENSIONS.SPACING * 1.5 }}>
            {t('auth.resetPasswordSent')}
          </Text>

          {/* Verification code */}
          <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textPrimary, marginBottom: DIMENSIONS.SPACING * 0.3 }}>
            {t('auth.verificationCode')}
          </Text>
          <TextInput
            style={{
              backgroundColor: colors.cardBackground, borderRadius: 12,
              padding: DIMENSIONS.SPACING * 0.9, color: colors.textPrimary,
              fontSize: TYPOGRAPHY.title, fontWeight: '700',
              borderWidth: 1.5, borderColor: colors.borderPrimary,
              marginBottom: DIMENSIONS.SPACING,
              textAlign: 'center', letterSpacing: 12,
            }}
            placeholder="— — — — — —"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            value={resetCode}
            onChangeText={(text) => {
              setResetCode(text);
              if (text.length === 6) newPasswordRef.current?.focus();
            }}
            maxLength={6}
            returnKeyType="next"
            onSubmitEditing={() => newPasswordRef.current?.focus()}
          />

          {/* New password */}
          <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textPrimary, marginBottom: DIMENSIONS.SPACING * 0.3 }}>
            {t('auth.newPassword')}
          </Text>
          <View style={{ position: 'relative', marginBottom: DIMENSIONS.SPACING }}>
            <TextInput
              ref={newPasswordRef}
              style={{
                backgroundColor: colors.cardBackground, borderRadius: 12,
                padding: DIMENSIONS.SPACING * 0.9, paddingRight: DIMENSIONS.SPACING * 3,
                color: colors.textPrimary, fontSize: TYPOGRAPHY.bodyS, fontWeight: '600',
                borderWidth: 1.5, borderColor: colors.borderPrimary,
              }}
              placeholder={t('auth.passwordPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showNewPassword}
              value={newPassword}
              onChangeText={setNewPassword}
              returnKeyType="done"
              onSubmitEditing={handlePasswordReset}
            />
            <TouchableOpacity
              onPress={() => setShowNewPassword(!showNewPassword)}
              style={{ position: 'absolute', right: DIMENSIONS.SPACING * 0.9, top: DIMENSIONS.SPACING * 0.9 }}
            >
              <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={TYPOGRAPHY.iconXS} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handlePasswordReset}
            disabled={isLoading || resetCode.length < 6 || newPassword.length < 8}
            style={{
              borderRadius: 16, paddingVertical: DIMENSIONS.SPACING * 0.9,
              backgroundColor: colors.textPrimary, alignItems: 'center',
              marginBottom: DIMENSIONS.SPACING,
              opacity: (resetCode.length < 6 || newPassword.length < 8) ? 0.5 : 1,
            }}
          >
            {isLoading
              ? <ActivityIndicator color={colors.backgroundPrimary} />
              : <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '900', color: colors.backgroundPrimary }}>{t('auth.ok')}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setPendingPasswordReset(false)} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textPrimary, opacity: 0.6 }}>
              {t('auth.back')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Email verification step
  if (pendingVerification) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: DIMENSIONS.CARD_PADDING }}>
          <Text style={{ fontSize: TYPOGRAPHY.titleL, fontWeight: '900', color: colors.textPrimary, marginBottom: DIMENSIONS.SPACING * 0.3 }}>
            {t('auth.checkEmail')}
          </Text>
          <Text style={{ fontSize: TYPOGRAPHY.bodyS, color: colors.textPrimary, opacity: 0.6, marginBottom: DIMENSIONS.SPACING * 1.5 }}>
            {t('auth.verificationSent')}
          </Text>
          <TextInput
            style={{
              backgroundColor: colors.cardBackground, borderRadius: 12,
              padding: DIMENSIONS.SPACING * 0.9, color: colors.textPrimary,
              fontSize: TYPOGRAPHY.bodyS, fontWeight: '600',
              borderWidth: 1.5, borderColor: colors.borderPrimary,
              marginBottom: DIMENSIONS.SPACING,
              textAlign: 'center', letterSpacing: 8,
            }}
            placeholder="000000"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            value={verificationCode}
            onChangeText={setVerificationCode}
            maxLength={6}
          />
          <TouchableOpacity
            onPress={handleVerify}
            disabled={isLoading || verificationCode.length < 6}
            style={{
              borderRadius: 16, paddingVertical: DIMENSIONS.SPACING * 0.9,
              backgroundColor: colors.textPrimary, alignItems: 'center',
            }}
          >
            {isLoading
              ? <ActivityIndicator color={colors.backgroundPrimary} />
              : <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '900', color: colors.backgroundPrimary }}>{t('auth.ok')}</Text>
            }
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: DIMENSIONS.CARD_PADDING }}>
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 2 }}>
            <View style={{
              width: DIMENSIONS.SCREEN_WIDTH * 0.14, height: DIMENSIONS.SCREEN_WIDTH * 0.14,
              borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.07, backgroundColor: colors.textPrimary,
              alignItems: 'center', justifyContent: 'center', marginBottom: DIMENSIONS.SPACING * 0.8,
            }}>
              <Text style={{ fontSize: TYPOGRAPHY.titleL, fontWeight: '900', color: colors.backgroundPrimary }}>L</Text>
            </View>
            <Text style={{ fontSize: TYPOGRAPHY.titleL, fontWeight: '900', color: colors.textPrimary, marginBottom: DIMENSIONS.SPACING * 0.3 }}>
              Lock
            </Text>
            <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '500', color: colors.textPrimary, opacity: 0.7 }}>
              {t('auth.welcome')}
            </Text>
          </View>

          {/* Form */}
          <View style={{ marginBottom: DIMENSIONS.SPACING * 1.2 }}>
            <View style={{ marginBottom: DIMENSIONS.SPACING * 0.8 }}>
              <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textPrimary, marginBottom: DIMENSIONS.SPACING * 0.3 }}>
                {t('auth.email')}
              </Text>
              <TextInput
                style={{ backgroundColor: colors.cardBackground, borderRadius: 12, padding: DIMENSIONS.SPACING * 0.9, color: colors.textPrimary, fontSize: TYPOGRAPHY.bodyS, fontWeight: '600', borderWidth: 1.5, borderColor: colors.borderPrimary }}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={{ marginBottom: DIMENSIONS.SPACING * 0.4 }}>
              <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textPrimary, marginBottom: DIMENSIONS.SPACING * 0.3 }}>
                {t('auth.password')}
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={{ backgroundColor: colors.cardBackground, borderRadius: 12, padding: DIMENSIONS.SPACING * 0.9, paddingRight: DIMENSIONS.SPACING * 3, color: colors.textPrimary, fontSize: TYPOGRAPHY.bodyS, fontWeight: '600', borderWidth: 1.5, borderColor: colors.borderPrimary }}
                  placeholder={t('auth.passwordPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: DIMENSIONS.SPACING * 0.9, top: DIMENSIONS.SPACING * 0.9 }}
                >
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={TYPOGRAPHY.iconXS} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {!isSignUp && (
              <TouchableOpacity onPress={handleForgotPassword} style={{ alignSelf: 'flex-end', marginBottom: DIMENSIONS.SPACING * 0.8 }}>
                <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textPrimary, opacity: 0.6 }}>
                  {t('auth.forgotPassword')}
                </Text>
              </TouchableOpacity>
            )}
            {isSignUp && <View style={{ marginBottom: DIMENSIONS.SPACING * 0.8 }} />}

            <TouchableOpacity
              onPress={handleAuth}
              disabled={isLoading}
              style={{ borderRadius: 16, paddingVertical: DIMENSIONS.SPACING * 0.9, backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: DIMENSIONS.SPACING * 0.8, elevation: 4 }}
            >
              {isLoading
                ? <ActivityIndicator color={colors.backgroundPrimary} size="small" />
                : <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '900', color: colors.backgroundPrimary }}>{isSignUp ? t('auth.signUp') : t('auth.login')}</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={{ alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 0.8 }}>
              <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textPrimary, opacity: 0.7 }}>
                {isSignUp ? t('auth.hasAccount') : t('auth.noAccount')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Social */}
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textPrimary, opacity: 0.5, marginBottom: DIMENSIONS.SPACING * 0.8 }}>
              {t('auth.orContinueWith')}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: DIMENSIONS.SPACING * 0.6 }}>
              <TouchableOpacity
                onPress={handleAppleLogin}
                disabled={isLoading || Platform.OS !== 'ios'}
                style={{ width: DIMENSIONS.SCREEN_WIDTH * 0.1, height: DIMENSIONS.SCREEN_WIDTH * 0.1, borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.05, backgroundColor: colors.cardBackground, borderWidth: 1.5, borderColor: colors.borderPrimary, alignItems: 'center', justifyContent: 'center', opacity: Platform.OS !== 'ios' ? 0.3 : 1 }}
              >
                <Ionicons name="logo-apple" size={TYPOGRAPHY.iconM} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleGoogleLogin}
                disabled={isLoading}
                style={{ width: DIMENSIONS.SCREEN_WIDTH * 0.1, height: DIMENSIONS.SCREEN_WIDTH * 0.1, borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.05, backgroundColor: colors.cardBackground, borderWidth: 1.5, borderColor: colors.borderPrimary, alignItems: 'center', justifyContent: 'center' }}
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
