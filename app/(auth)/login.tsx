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

  useEffect(() => {
    AsyncStorage.getItem('lock_saved_email').then((saved) => {
      if (saved) setEmail(saved);
    });
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
  const codeRefs = useRef<(TextInput | null)[]>([null, null, null, null, null, null]);
  const [pendingPasswordReset, setPendingPasswordReset] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const newPasswordRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

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
          const localFlag = uid
            ? await AsyncStorage.getItem(`lock_onboarding_done_${uid}`).catch(() => null)
            : null;
          if (localFlag === 'true') {
            router.replace('/(tabs)/today');
          } else {
            const cached = useStore.getState().user;
            if (cached?.hasCompletedOnboarding) {
              router.replace('/(tabs)/today');
            } else {
              useStore.getState().setHasSelectedLanguage(false);
              router.replace('/(auth)/language-selection');
            }
          }
          return;
        }
      }
    }
    if (!profile) return;

    let completedOnboarding = profile.hasCompletedOnboarding;
    if (!completedOnboarding) {
      const localFlag = await AsyncStorage.getItem(`lock_onboarding_done_${profile.id}`).catch(() => null);
      if (localFlag === 'true') {
        completedOnboarding = true;
        updateProfile({ hasCompletedOnboarding: true }).catch(() => {});
      }
    }

    setUser({
      id: profile.id,
      name: profile.name || email.split('@')[0] || 'User',
      email: profile.email || email,
      username: profile.username ?? undefined,
      bio: profile.bio ?? undefined,
      avatarEmoji: profile.avatarEmoji ?? undefined,
      avatarImage: profile.avatarImage ?? undefined,
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
      hasCompletedOnboarding: completedOnboarding,
    });

    if (rememberMe && email) {
      AsyncStorage.setItem('lock_saved_email', email).catch(() => {});
    }

    if (completedOnboarding) {
      router.replace('/(tabs)/today');
    } else {
      useStore.getState().setHasSelectedLanguage(false);
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
        const result = await signUp!.create({ emailAddress: email, password });
        if (result.status === 'complete' && result.createdSessionId) {
          await setSignUpActive!({ session: result.createdSessionId });
          setTokenGetter(getToken);
          await onAuthSuccess();
        } else {
          await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' });
          setCodeDigits(['', '', '', '', '', '']);
          setPendingVerification(true);
        }
      } else {
        const result = await signIn.create({ identifier: email, password });
        await setSignInActive({ session: result.createdSessionId });
        setTokenGetter(getToken);
        await onAuthSuccess();
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? err?.message ?? '';
      const code = err?.errors?.[0]?.code ?? '';
      Alert.alert(t('auth.error'), `${code ? `[${code}] ` : ''}${msg || t('auth.loginFailed')}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (code: string) => {
    if (!signUpLoaded || code.length < 6) return;
    setIsLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      await setSignUpActive({ session: result.createdSessionId });
      setTokenGetter(getToken);
      await onAuthSuccess();
    } catch (err: any) {
      Alert.alert(t('auth.error'), err.errors?.[0]?.longMessage || t('auth.loginFailed'));
      setCodeDigits(['', '', '', '', '', '']);
      codeRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const activateOAuthSession = async (
    result: { createdSessionId: string | null; setActive?: any; signIn?: any; signUp?: any }
  ) => {
    const sessionId = result.createdSessionId
      ?? result.signUp?.createdSessionId
      ?? result.signIn?.createdSessionId;

    if (sessionId && result.setActive) {
      await result.setActive({ session: sessionId });
      setTokenGetter(getToken);
      await onAuthSuccess();
      return;
    }

    if (result.signUp?.status === 'missing_requirements') {
      const missing = result.signUp.missingFields?.join(', ') ?? 'unknown';
      Alert.alert('Config Error', `Missing: ${missing}\nClerk Dashboard → Configure → set Username/Phone to Optional.`);
      return;
    }

    const signUpStatus = result.signUp?.status ?? 'none';
    const signInStatus = result.signIn?.status ?? 'none';
    Alert.alert('OAuth Error', `No session.\nsignUp:${signUpStatus}\nsignIn:${signInStatus}`);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await googleOAuth({ redirectUrl: Linking.createURL('/oauth-callback') });
      await activateOAuthSession(result);
    } catch (err: any) {
      Alert.alert(t('auth.error'), err?.errors?.[0]?.longMessage ?? err?.message ?? 'Google login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    if (Platform.OS !== 'ios') return;
    setIsLoading(true);
    try {
      const result = await appleOAuth({ redirectUrl: Linking.createURL('/oauth-callback') });
      await activateOAuthSession(result);
    } catch (err: any) {
      Alert.alert(t('auth.error'), err?.errors?.[0]?.longMessage ?? err?.message ?? 'Apple login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setIsLoading(true);
    try {
      const result = await facebookOAuth({ redirectUrl: Linking.createURL('/oauth-callback') });
      await activateOAuthSession(result);
    } catch (err: any) {
      Alert.alert(t('auth.error'), err?.errors?.[0]?.longMessage ?? err?.message ?? 'Facebook login failed');
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

  // ─── OTP Verification Screen ─────────────────────────────────────────────────
  if (pendingVerification) {
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
            {/* Back */}
            <TouchableOpacity
              onPress={() => { setPendingVerification(false); setCodeDigits(['', '', '', '', '', '']); }}
              style={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingTop: DIMENSIONS.SPACING * 0.8, alignSelf: 'flex-start' }}
            >
              <Ionicons name="arrow-back" size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={{
              flex: 1, justifyContent: 'center',
              paddingHorizontal: DIMENSIONS.CARD_PADDING * 1.5,
              paddingBottom: DIMENSIONS.SPACING * 2,
            }}>
              {/* Icon */}
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
                  color: colors.textPrimary, marginBottom: DIMENSIONS.SPACING * 0.3,
                  letterSpacing: -0.5,
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
                gap: DIMENSIONS.SPACING * 0.4,
                marginBottom: DIMENSIONS.SPACING * 1.5,
              }}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <View key={i} style={{
                    width: DIMENSIONS.SCREEN_WIDTH * 0.12,
                    height: DIMENSIONS.SCREEN_WIDTH * 0.15,
                    borderRadius: 14,
                    backgroundColor: colors.cardBackground,
                    borderWidth: 2,
                    borderColor: codeDigits[i] ? colors.textPrimary : colors.borderPrimary,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <TextInput
                      ref={(r) => { codeRefs.current[i] = r; }}
                      style={{
                        width: '100%', height: '100%',
                        textAlign: 'center',
                        fontSize: TYPOGRAPHY.titleS,
                        fontWeight: '900',
                        color: colors.textPrimary,
                      }}
                      keyboardType="number-pad"
                      maxLength={1}
                      value={codeDigits[i]}
                      onChangeText={(val) => {
                        const digit = val.replace(/[^0-9]/g, '').slice(-1);
                        const next = [...codeDigits];
                        next[i] = digit;
                        setCodeDigits(next);
                        if (digit && i < 5) {
                          codeRefs.current[i + 1]?.focus();
                        }
                        if (next.every(d => d !== '')) {
                          handleVerify(next.join(''));
                        }
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

              {/* Verify button */}
              <TouchableOpacity
                onPress={() => handleVerify(currentCode)}
                disabled={isLoading || currentCode.length < 6}
                style={{
                  borderRadius: 16, paddingVertical: DIMENSIONS.SPACING * 0.7,
                  backgroundColor: currentCode.length === 6 ? colors.textPrimary : colors.cardBackground,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: currentCode.length < 6 ? 1.5 : 0,
                  borderColor: colors.borderPrimary,
                  marginBottom: DIMENSIONS.SPACING * 0.8,
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

              {/* Resend */}
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' });
                    setCodeDigits(['', '', '', '', '', '']);
                    codeRefs.current[0]?.focus();
                  } catch {}
                }}
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

  // ─── Password Reset Screen ────────────────────────────────────────────────────
  if (pendingPasswordReset) {
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
              onPress={() => setPendingPasswordReset(false)}
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
                  color: colors.textPrimary, marginBottom: DIMENSIONS.SPACING * 0.3,
                  letterSpacing: -0.5,
                }}>
                  {t('auth.resetPassword')}
                </Text>
                <Text style={{ fontSize: TYPOGRAPHY.bodyS, color: colors.textPrimary, opacity: 0.5, textAlign: 'center' }}>
                  {t('auth.resetPasswordSent')}
                </Text>
              </View>

              {/* Code input */}
              <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textPrimary, opacity: 0.6, marginBottom: DIMENSIONS.SPACING * 0.3, textTransform: 'uppercase', letterSpacing: 1 }}>
                {t('auth.verificationCode')}
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.cardBackground, borderRadius: 14,
                  padding: DIMENSIONS.SPACING * 0.8, color: colors.textPrimary,
                  fontSize: TYPOGRAPHY.titleS, fontWeight: '900',
                  borderWidth: 2, borderColor: resetCode.length === 6 ? colors.textPrimary : colors.borderPrimary,
                  marginBottom: DIMENSIONS.SPACING,
                  textAlign: 'center', letterSpacing: 10,
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
                  onSubmitEditing={handlePasswordReset}
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={{ position: 'absolute', right: DIMENSIONS.SPACING * 0.9, top: DIMENSIONS.SPACING * 0.85 }}
                >
                  <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={TYPOGRAPHY.iconXS} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handlePasswordReset}
                disabled={isLoading || resetCode.length < 6 || newPassword.length < 8}
                style={{
                  borderRadius: 16, paddingVertical: DIMENSIONS.SPACING * 0.7,
                  backgroundColor: (resetCode.length === 6 && newPassword.length >= 8) ? colors.textPrimary : colors.cardBackground,
                  alignItems: 'center',
                  borderWidth: (resetCode.length < 6 || newPassword.length < 8) ? 1.5 : 0,
                  borderColor: colors.borderPrimary,
                }}
              >
                {isLoading
                  ? <ActivityIndicator color={colors.backgroundPrimary} />
                  : <Text style={{
                    fontSize: TYPOGRAPHY.bodyS, fontWeight: '900',
                    color: (resetCode.length === 6 && newPassword.length >= 8) ? colors.backgroundPrimary : colors.textSecondary,
                  }}>
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

  // ─── Main Login Screen ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingHorizontal: DIMENSIONS.CARD_PADDING * 1.2, paddingVertical: DIMENSIONS.SPACING }}>

            {/* ── Brand ── */}
            <View style={{ alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 1.8 }}>
              <View style={{
                width: DIMENSIONS.SCREEN_WIDTH * 0.16, height: DIMENSIONS.SCREEN_WIDTH * 0.16,
                borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.04,
                backgroundColor: colors.textPrimary,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: DIMENSIONS.SPACING * 0.5,
              }}>
                <Text style={{ fontSize: TYPOGRAPHY.titleM, fontWeight: '900', color: colors.backgroundPrimary, letterSpacing: -1 }}>L</Text>
              </View>
              <Text style={{
                fontSize: TYPOGRAPHY.titleM, fontWeight: '900',
                color: colors.textPrimary, letterSpacing: -1,
                marginBottom: DIMENSIONS.SPACING * 0.15,
              }}>
                Lock
              </Text>
              <Text style={{
                fontSize: TYPOGRAPHY.bodyXS, fontWeight: '500',
                color: colors.textPrimary, opacity: 0.45, letterSpacing: 0.5,
              }}>
                {t('auth.welcome')}
              </Text>
            </View>

            {/* ── Social Buttons ── */}
            <View style={{ gap: DIMENSIONS.SPACING * 0.45, marginBottom: DIMENSIONS.SPACING * 1 }}>
              {Platform.OS === 'ios' && (
                <SocialButton
                  icon="logo-apple"
                  label={t('auth.continueWithApple')}
                  onPress={handleAppleLogin}
                  disabled={isLoading}
                  colors={colors}
                  filled
                />
              )}
              <SocialButton
                icon="logo-google"
                label={t('auth.continueWithGoogle')}
                onPress={handleGoogleLogin}
                disabled={isLoading}
                colors={colors}
              />
              <SocialButton
                icon="logo-facebook"
                label={t('auth.continueWithFacebook')}
                onPress={handleFacebookLogin}
                disabled={isLoading}
                colors={colors}
              />
            </View>

            {/* ── Divider ── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 1, gap: DIMENSIONS.SPACING * 0.5 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.borderPrimary }} />
              <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textPrimary, opacity: 0.35, letterSpacing: 1, textTransform: 'uppercase' }}>
                {t('auth.orContinueWith')}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.borderPrimary }} />
            </View>

            {/* ── Email / Password ── */}
            <View style={{ gap: DIMENSIONS.SPACING * 0.5, marginBottom: DIMENSIONS.SPACING * 0.6 }}>
              <TextInput
                style={{
                  backgroundColor: colors.cardBackground, borderRadius: 14,
                  paddingHorizontal: DIMENSIONS.SPACING * 0.8, paddingVertical: DIMENSIONS.SPACING * 0.65,
                  color: colors.textPrimary, fontSize: TYPOGRAPHY.bodyS, fontWeight: '600',
                  borderWidth: 2, borderColor: colors.borderPrimary,
                }}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              <View style={{ position: 'relative' }}>
                <TextInput
                  ref={passwordRef}
                  style={{
                    backgroundColor: colors.cardBackground, borderRadius: 14,
                    paddingHorizontal: DIMENSIONS.SPACING * 0.8, paddingVertical: DIMENSIONS.SPACING * 0.65,
                    paddingRight: DIMENSIONS.SPACING * 2.5,
                    color: colors.textPrimary, fontSize: TYPOGRAPHY.bodyS, fontWeight: '600',
                    borderWidth: 2, borderColor: colors.borderPrimary,
                  }}
                  placeholder={t('auth.passwordPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={handleAuth}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: DIMENSIONS.SPACING * 0.9, top: DIMENSIONS.SPACING * 0.65 }}
                >
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={TYPOGRAPHY.iconXS} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember me + Forgot password */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING * 0.8 }}>
              <TouchableOpacity
                onPress={() => {
                  const next = !rememberMe;
                  setRememberMe(next);
                  if (!next) AsyncStorage.removeItem('lock_saved_email').catch(() => {});
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                activeOpacity={0.7}
              >
                <View style={{
                  width: 18, height: 18, borderRadius: 5,
                  borderWidth: 2, borderColor: rememberMe ? colors.textPrimary : colors.borderPrimary,
                  backgroundColor: rememberMe ? colors.textPrimary : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {rememberMe && <Ionicons name="checkmark" size={11} color={colors.backgroundPrimary} />}
                </View>
                <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textPrimary, opacity: 0.55 }}>
                  {t('auth.rememberEmail' as any)}
                </Text>
              </TouchableOpacity>

              {!isSignUp && (
                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textPrimary, opacity: 0.45 }}>
                    {t('auth.forgotPassword')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleAuth}
              disabled={isLoading}
              style={{
                borderRadius: 16, paddingVertical: DIMENSIONS.SPACING * 0.7,
                backgroundColor: colors.textPrimary,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: DIMENSIONS.SPACING * 0.6,
              }}
            >
              {isLoading
                ? <ActivityIndicator color={colors.backgroundPrimary} size="small" />
                : <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '900', color: colors.backgroundPrimary, letterSpacing: 0.3 }}>
                  {isSignUp ? t('auth.signUp') : t('auth.login')}
                </Text>
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

// ─── Social Button Component ──────────────────────────────────────────────────
function SocialButton({
  icon, label, onPress, disabled, colors, filled = false,
}: {
  icon: string; label: string; onPress: () => void;
  disabled: boolean; colors: any; filled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        borderRadius: 14, paddingVertical: DIMENSIONS.SPACING * 0.65,
        backgroundColor: filled ? colors.textPrimary : colors.cardBackground,
        borderWidth: 2,
        borderColor: filled ? colors.textPrimary : colors.borderPrimary,
        gap: DIMENSIONS.SPACING * 0.4,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Ionicons
        name={icon as any}
        size={TYPOGRAPHY.iconXS}
        color={filled ? colors.backgroundPrimary : colors.textPrimary}
      />
      <Text style={{
        fontSize: TYPOGRAPHY.bodyS, fontWeight: '700',
        color: filled ? colors.backgroundPrimary : colors.textPrimary,
        letterSpacing: 0.2,
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
