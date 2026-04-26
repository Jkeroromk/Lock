import {
  View, Text, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSignIn, useSignUp, useOAuth, useAuth } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setTokenGetter } from '@/services/tokenStore';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { fetchProfile, updateProfile } from '@/services/api';
import { SocialButton, GoogleG } from '@/components/auth/SocialButton';
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
  const { startOAuthFlow: appleOAuth } = useOAuth({ strategy: 'oauth_apple' });
  const { startOAuthFlow: facebookOAuth } = useOAuth({ strategy: 'oauth_facebook' });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [pendingPasswordReset, setPendingPasswordReset] = useState(false);
  const passwordRef = useRef<TextInput>(null);

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
    if (result.signUp?.status === 'missing_requirements') {
      const missing = result.signUp.missingFields?.join(', ') ?? 'unknown';
      Alert.alert('Config Error', `Missing: ${missing}\nClerk Dashboard → Configure → set Username/Phone to Optional.`); return;
    }
    const signUpStatus = result.signUp?.status ?? 'none';
    const signInStatus = result.signIn?.status ?? 'none';
    Alert.alert('OAuth Error', `No session.\nsignUp:${signUpStatus}\nsignIn:${signInStatus}`);
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
    try { const result = await appleOAuth({ redirectUrl: Linking.createURL('/oauth-callback') }); await activateOAuthSession(result); }
    catch (err: any) { if (!isOAuthCancel(err)) Alert.alert(t('auth.error'), err?.errors?.[0]?.longMessage ?? err?.message ?? 'Apple login failed'); }
    finally { setIsLoading(false); }
  };

  const handleFacebookLogin = async () => {
    setIsLoading(true);
    try { const result = await facebookOAuth({ redirectUrl: Linking.createURL('/oauth-callback') }); await activateOAuthSession(result); }
    catch (err: any) { if (!isOAuthCancel(err)) Alert.alert(t('auth.error'), err?.errors?.[0]?.longMessage ?? err?.message ?? 'Facebook login failed'); }
    finally { setIsLoading(false); }
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
          <View style={{ paddingHorizontal: DIMENSIONS.CARD_PADDING * 1.2, paddingVertical: DIMENSIONS.SPACING }}>

            {/* Brand */}
            <View style={{ alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 1.8 }}>
              <View style={{
                width: DIMENSIONS.SCREEN_WIDTH * 0.16, height: DIMENSIONS.SCREEN_WIDTH * 0.16,
                borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.04, backgroundColor: colors.textPrimary,
                alignItems: 'center', justifyContent: 'center', marginBottom: DIMENSIONS.SPACING * 0.5,
              }}>
                <Text style={{ fontSize: TYPOGRAPHY.titleM, fontWeight: '900', color: colors.backgroundPrimary, letterSpacing: -1 }}>L</Text>
              </View>
              <Text style={{ fontSize: TYPOGRAPHY.titleM, fontWeight: '900', color: colors.textPrimary, letterSpacing: -1, marginBottom: DIMENSIONS.SPACING * 0.15 }}>Lock</Text>
              <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '500', color: colors.textPrimary, opacity: 0.45, letterSpacing: 0.5 }}>
                {t('auth.welcome')}
              </Text>
            </View>

            {/* Social Buttons */}
            <View style={{ gap: DIMENSIONS.SPACING * 0.45, marginBottom: DIMENSIONS.SPACING * 1 }}>
              {Platform.OS === 'ios' && (
                <SocialButton icon="logo-apple" label={t('auth.continueWithApple')} onPress={handleAppleLogin} disabled={isLoading} colors={colors} filled />
              )}
              <TouchableOpacity
                onPress={handleGoogleLogin} disabled={isLoading} activeOpacity={0.75}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 14, paddingVertical: DIMENSIONS.SPACING * 0.65,
                  backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E0E0E0',
                  gap: DIMENSIONS.SPACING * 0.4, opacity: isLoading ? 0.5 : 1,
                }}
              >
                <GoogleG size={TYPOGRAPHY.iconXS} />
                <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: '#3C4043', letterSpacing: 0.2 }}>
                  {t('auth.continueWithGoogle')}
                </Text>
              </TouchableOpacity>
              <SocialButton icon="logo-facebook" label={t('auth.continueWithFacebook')} onPress={handleFacebookLogin} disabled={isLoading} colors={colors} brandColor="#1877F2" />
            </View>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 1, gap: DIMENSIONS.SPACING * 0.5 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.borderPrimary }} />
              <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textPrimary, opacity: 0.35, letterSpacing: 1, textTransform: 'uppercase' }}>
                {t('auth.orContinueWith')}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.borderPrimary }} />
            </View>

            {/* Email / Password */}
            <View style={{ gap: DIMENSIONS.SPACING * 0.5, marginBottom: DIMENSIONS.SPACING * 0.6 }}>
              <TextInput
                style={{ backgroundColor: colors.cardBackground, borderRadius: 14, paddingHorizontal: DIMENSIONS.SPACING * 0.8, paddingVertical: DIMENSIONS.SPACING * 0.65, color: colors.textPrimary, fontSize: TYPOGRAPHY.bodyS, fontWeight: '600', borderWidth: 2, borderColor: colors.borderPrimary }}
                placeholder={t('auth.emailPlaceholder')} placeholderTextColor={colors.textSecondary}
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                returnKeyType="next" value={email} onChangeText={setEmail}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              <View style={{ position: 'relative' }}>
                <TextInput
                  ref={passwordRef}
                  style={{ backgroundColor: colors.cardBackground, borderRadius: 14, paddingHorizontal: DIMENSIONS.SPACING * 0.8, paddingVertical: DIMENSIONS.SPACING * 0.65, paddingRight: DIMENSIONS.SPACING * 2.5, color: colors.textPrimary, fontSize: TYPOGRAPHY.bodyS, fontWeight: '600', borderWidth: 2, borderColor: colors.borderPrimary }}
                  placeholder={t('auth.passwordPlaceholder')} placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword} returnKeyType="done" value={password}
                  onChangeText={setPassword} onSubmitEditing={handleAuth}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: DIMENSIONS.SPACING * 0.9, top: DIMENSIONS.SPACING * 0.65 }}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={TYPOGRAPHY.iconXS} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember me + Forgot */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING * 0.8 }}>
              <TouchableOpacity onPress={() => { const next = !rememberMe; setRememberMe(next); if (!next) AsyncStorage.removeItem('lock_saved_email').catch(() => {}); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} activeOpacity={0.7}>
                <View style={{ width: 18, height: 18, borderRadius: 5, borderWidth: 2, borderColor: rememberMe ? colors.textPrimary : colors.borderPrimary, backgroundColor: rememberMe ? colors.textPrimary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {rememberMe && <Ionicons name="checkmark" size={11} color={colors.backgroundPrimary} />}
                </View>
                <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textPrimary, opacity: 0.55 }}>{t('auth.rememberEmail' as any)}</Text>
              </TouchableOpacity>
              {!isSignUp && (
                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textPrimary, opacity: 0.45 }}>{t('auth.forgotPassword')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Submit */}
            <TouchableOpacity onPress={handleAuth} disabled={isLoading} style={{ borderRadius: 16, paddingVertical: DIMENSIONS.SPACING * 0.7, backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: DIMENSIONS.SPACING * 0.6 }}>
              {isLoading
                ? <ActivityIndicator color={colors.backgroundPrimary} size="small" />
                : <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '900', color: colors.backgroundPrimary, letterSpacing: 0.3 }}>{isSignUp ? t('auth.signUp') : t('auth.login')}</Text>
              }
            </TouchableOpacity>

            {/* Toggle */}
            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textPrimary, opacity: 0.45 }}>
                {isSignUp ? t('auth.hasAccount') : t('auth.noAccount')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
