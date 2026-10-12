import {
  View, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSignIn, useSignUp, useOAuth, useAuth, useSignInWithApple } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setTokenGetter } from '@/services/tokenStore';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { Button, HardShadow, TextField } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { fetchProfile, updateProfile } from '@/services/api';
import { SocialButton } from '@/components/auth/SocialButton';
import OtpVerificationScreen from '@/components/auth/OtpVerificationScreen';
import ForgotPasswordScreen from '@/components/auth/ForgotPasswordScreen';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setUser } = useStore();
  const colors = useTheme();

  const { getToken, userId: clerkUserId } = useAuth();
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const { startOAuthFlow: googleOAuth } = useOAuth({ strategy: 'oauth_google' });
  // Native Sign in with Apple (system sheet / Face ID) instead of a browser redirect.
  const { startAppleAuthenticationFlow } = useSignInWithApple();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [pendingPasswordReset, setPendingPasswordReset] = useState(false);
  const passwordRef = useRef<any>(null);

  useEffect(() => {
    AsyncStorage.getItem('lock_saved_email').then((saved) => { if (saved) setEmail(saved); });
  }, []);

  const onAuthSuccess = async () => {
    let profile = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, 400));
        profile = await fetchProfile();
        break;
      } catch {
        if (attempt === 2) {
          const uid = clerkUserId;
          const localFlag = uid ? await AsyncStorage.getItem(`lock_onboarding_done_${uid}`).catch(() => null) : null;
          if (localFlag === 'true') { router.replace('/(tabs)/today'); }
          else {
            const cached = useStore.getState().user;
            if (cached?.hasCompletedOnboarding) { router.replace('/(tabs)/today'); }
            else { useStore.getState().setHasSelectedLanguage(false); router.replace('/(auth)/language-selection'); }
          }
          return;
        }
      }
    }
    if (!profile) return;

    let completedOnboarding = profile.hasCompletedOnboarding;
    if (!completedOnboarding) {
      const localFlag = await AsyncStorage.getItem(`lock_onboarding_done_${profile.id}`).catch(() => null);
      if (localFlag === 'true') { completedOnboarding = true; updateProfile({ hasCompletedOnboarding: true }).catch(() => {}); }
    }

    setUser({
      id: profile.id, name: profile.name || email.split('@')[0] || 'User',
      email: profile.email || email, username: profile.username ?? undefined,
      bio: profile.bio ?? undefined, avatarEmoji: profile.avatarEmoji ?? undefined,
      avatarImage: profile.avatarImage ?? undefined, showGender: profile.showGender ?? false,
      height: profile.height ?? undefined, age: profile.age ?? undefined,
      weight: profile.weight ?? undefined, gender: profile.gender as any,
      goal: profile.goal as any, exerciseFrequency: profile.exerciseFrequency as any,
      expectedTimeframe: profile.expectedTimeframe as any,
      plan: (profile.plan ?? 'FREE') as any, streak: profile.streak ?? 0,
      hasCompletedOnboarding: completedOnboarding,
      inviteCode: profile.inviteCode ?? undefined,
    });

    if (rememberMe && email) AsyncStorage.setItem('lock_saved_email', email).catch(() => {});

    if (completedOnboarding) { router.replace('/(tabs)/today'); }
    else { useStore.getState().setHasSelectedLanguage(false); router.replace('/(auth)/language-selection'); }
  };

  const handleAuth = async () => {
    if (!email || !password) { Alert.alert(t('auth.error'), t('auth.fillAllFields')); return; }
    if (password.length < 8) { Alert.alert(t('auth.error'), t('auth.passwordTooShort')); return; }
    if (!signInLoaded || !signUpLoaded) return;
    setIsLoading(true);
    try {
      if (isSignUp) {
        const result = await signUp!.create({ emailAddress: email, password });
        if (result.status === 'complete' && result.createdSessionId) {
          await setSignUpActive!({ session: result.createdSessionId });
          setTokenGetter(getToken); await onAuthSuccess();
        } else {
          await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' });
          setPendingVerification(true);
        }
      } else {
        const result = await signIn.create({ identifier: email, password });
        await setSignInActive({ session: result.createdSessionId });
        setTokenGetter(getToken); await onAuthSuccess();
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? err?.message ?? '';
      const code = err?.errors?.[0]?.code ?? '';
      Alert.alert(t('auth.error'), `${code ? `[${code}] ` : ''}${msg || t('auth.loginFailed')}`);
    } finally { setIsLoading(false); }
  };

  const handleVerify = async (code: string) => {
    if (!signUpLoaded || code.length < 6) return;
    setIsLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      await setSignUpActive({ session: result.createdSessionId });
      setTokenGetter(getToken); await onAuthSuccess();
    } catch (err: any) {
      Alert.alert(t('auth.error'), err.errors?.[0]?.longMessage || t('auth.loginFailed'));
    } finally { setIsLoading(false); }
  };

  const activateOAuthSession = async (result: { createdSessionId: string | null; setActive?: any; signIn?: any; signUp?: any }) => {
    const sessionId = result.createdSessionId ?? result.signUp?.createdSessionId ?? result.signIn?.createdSessionId;
    if (sessionId && result.setActive) {
      await result.setActive({ session: sessionId }); setTokenGetter(getToken); await onAuthSuccess(); return;
    }
    if (result.signUp?.status === 'missing_requirements' || !sessionId) {
      Alert.alert(t('auth.error'), t('auth.loginFailed'));
    }
  };

  const isOAuthCancel = (err: any) => {
    const msg = (err?.message ?? err?.errors?.[0]?.message ?? '').toLowerCase();
    const code = (err?.errors?.[0]?.code ?? '').toLowerCase();
    return msg.includes('cancel') || msg.includes('dismiss') || msg.includes('abort') || code.includes('cancel') || code.includes('dismiss');
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try { const result = await googleOAuth({ redirectUrl: Linking.createURL('/oauth-callback') }); await activateOAuthSession(result); }
    catch (err: any) { if (!isOAuthCancel(err)) Alert.alert(t('auth.error'), err?.errors?.[0]?.longMessage ?? err?.message ?? 'Google login failed'); }
    finally { setIsLoading(false); }
  };

  const handleAppleLogin = async () => {
    if (Platform.OS !== 'ios') return;
    setIsLoading(true);
    try {
      const result = await startAppleAuthenticationFlow();
      if (!result.createdSessionId) {
        // No session and no error: the user closed the Apple sheet.
        if (result.signUp?.status === 'missing_requirements') Alert.alert(t('auth.error'), t('auth.loginFailed'));
        return;
      }
      await activateOAuthSession(result);
    } catch (err: any) {
      if (err?.code !== 'ERR_REQUEST_CANCELED' && !isOAuthCancel(err)) {
        Alert.alert(t('auth.error'), err?.errors?.[0]?.longMessage ?? err?.message ?? 'Apple login failed');
      }
    } finally { setIsLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!email) { Alert.alert(t('auth.error'), t('auth.enterEmailFirst')); return; }
    if (!signInLoaded) return;
    try { await signIn.create({ strategy: 'reset_password_email_code', identifier: email }); setPendingPasswordReset(true); }
    catch (err: any) { Alert.alert(t('auth.error'), err.errors?.[0]?.longMessage || t('auth.resetFailed')); }
  };

  const handlePasswordReset = async (code: string, newPassword: string) => {
    if (!signInLoaded) return;
    setIsLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({ strategy: 'reset_password_email_code', code });
      if (result.status === 'needs_new_password') {
        const resetResult = await signIn.resetPassword({ password: newPassword });
        if (resetResult.status === 'complete') {
          await setSignInActive({ session: resetResult.createdSessionId });
          setTokenGetter(getToken); setPendingPasswordReset(false); await onAuthSuccess();
        }
      }
    } catch (err: any) { Alert.alert(t('auth.error'), err.errors?.[0]?.longMessage || t('auth.loginFailed')); }
    finally { setIsLoading(false); }
  };

  if (pendingVerification) {
    return (
      <OtpVerificationScreen
        email={email}
        isLoading={isLoading}
        onVerify={handleVerify}
        onResend={async () => { try { await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' }); } catch {} }}
        onBack={() => setPendingVerification(false)}
      />
    );
  }

  if (pendingPasswordReset) {
    return (
      <ForgotPasswordScreen
        isLoading={isLoading}
        onReset={handlePasswordReset}
        onBack={() => setPendingPasswordReset(false)}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 22, paddingVertical: 24 }}>

            {/* Brand */}
            <View style={{ alignItems: 'flex-start', marginBottom: 28 }}>
              <HardShadow color={colors.cardShadow} radius={20} offset={5} style={{ transform: [{ rotate: '-4deg' }] }}>
                <Image source={require('@/assets/icons/preview-open-lock.png')} style={{ width: 84, height: 84, borderRadius: 19 }} accessibilityIgnoresInvertColors accessibilityLabel="Lock" />
              </HardShadow>
              <Text accessibilityRole="header" style={{ fontSize: 52, fontWeight: '800', letterSpacing: -2.2, lineHeight: 54, color: colors.textPrimary, marginTop: 22 }}>
                Lock in.
              </Text>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: colors.textSecondary, marginTop: 8, textTransform: 'uppercase' }}>
                {t('auth.welcome')}
              </Text>
            </View>

            {/* Social */}
            <View style={{ gap: 8 }}>
              {Platform.OS === 'ios' && (
                <SocialButton provider="apple" label={t('auth.continueWithApple')} onPress={handleAppleLogin} disabled={isLoading} />
              )}
              <SocialButton provider="google" label={t('auth.continueWithGoogle')} onPress={handleGoogleLogin} disabled={isLoading} />
            </View>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 }}>
              <View style={{ flex: 1, height: 1.5, backgroundColor: colors.borderPrimary }} />
              <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase' }}>
                {t('auth.orContinueWith')}
              </Text>
              <View style={{ flex: 1, height: 1.5, backgroundColor: colors.borderPrimary }} />
            </View>

            {/* Email / Password */}
            <View style={{ gap: 8 }}>
              <TextField
                accessibilityLabel={t('auth.email')}
                placeholder={t('auth.emailPlaceholder')}
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress"
                returnKeyType="next" value={email} onChangeText={setEmail}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              <TextField
                ref={passwordRef}
                accessibilityLabel={t('auth.password')}
                placeholder={t('auth.passwordPlaceholder')}
                secureTextEntry={!showPassword} returnKeyType="done" value={password}
                autoComplete={isSignUp ? 'new-password' : 'current-password'} textContentType={isSignUp ? 'newPassword' : 'password'}
                onChangeText={setPassword} onSubmitEditing={handleAuth}
                right={
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                }
              />
            </View>

            {/* Remember me + Forgot */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              <TouchableOpacity
                onPress={() => { const next = !rememberMe; setRememberMe(next); if (!next) AsyncStorage.removeItem('lock_saved_email').catch(() => {}); }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberMe }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}
                activeOpacity={0.7}
              >
                <View style={{
                  width: 20, height: 20, borderRadius: 6, borderWidth: 2,
                  borderColor: rememberMe ? colors.ink : colors.borderPrimary,
                  backgroundColor: rememberMe ? colors.accent : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {rememberMe && <Ionicons name="checkmark" size={13} color={colors.onAccent} />}
                </View>
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>{t('auth.rememberEmail' as any)}</Text>
              </TouchableOpacity>
              {!isSignUp && (
                <TouchableOpacity onPress={handleForgotPassword} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{t('auth.forgotPassword')}</Text>
                </TouchableOpacity>
              )}
            </View>

            <Button
              label={isSignUp ? t('auth.signUp') : t('auth.login')}
              loading={isLoading}
              onPress={handleAuth}
              style={{ marginTop: 8 }}
            />

            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} accessibilityRole="button" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
                {isSignUp ? t('auth.hasAccount') : t('auth.noAccount')}
              </Text>
            </TouchableOpacity>

            {/* Terms agreement (required before posting user content — App Store 1.2) */}
            <Text style={{ fontSize: 12, lineHeight: 18, color: colors.textSecondary, textAlign: 'center', marginTop: 14, paddingHorizontal: 8 }}>
              {t('auth.agreePrefix')}
              <Text style={{ fontWeight: '700', color: colors.textPrimary, textDecorationLine: 'underline' }} onPress={() => router.push('/legal/terms')}>
                {t('settings.termsOfService')}
              </Text>
              {t('auth.agreeAnd')}
              <Text style={{ fontWeight: '700', color: colors.textPrimary, textDecorationLine: 'underline' }} onPress={() => router.push('/legal/privacy')}>
                {t('settings.privacyPolicy')}
              </Text>
              {t('auth.agreeSuffix')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
