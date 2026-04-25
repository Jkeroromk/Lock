import { View, Text, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { useUser, useAuth } from '@clerk/clerk-expo';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

type OAuthStrategy = 'oauth_google' | 'oauth_apple' | 'oauth_facebook';

export default function AccountSecurityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useTheme();
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const externalAccounts = user?.externalAccounts ?? [];
  const isLinked = (provider: string) =>
    externalAccounts.some((a) => a.provider === provider);

  const handleLink = async (strategy: OAuthStrategy) => {
    const provider = strategy.replace('oauth_', '');
    setLinkingProvider(provider);
    try {
      const externalAccount = await user?.createExternalAccount({
        strategy,
        redirectUrl: Linking.createURL('/oauth-callback'),
      });
      const url = externalAccount?.verification?.externalVerificationRedirectURL;
      if (url) {
        await WebBrowser.openAuthSessionAsync(
          url.toString(),
          Linking.createURL('/oauth-callback'),
        );
        await user?.reload();
        Alert.alert(t('settings.success'), t('settings.linkSuccess'));
      }
    } catch (err: any) {
      if (err?.errors?.[0]?.code === 'external_account_exists') {
        Alert.alert(t('settings.error'), t('settings.accountAlreadyLinked'));
      } else if (err?.message !== 'cancelled') {
        Alert.alert(t('settings.error'), t('settings.linkFailed'));
      }
    } finally {
      setLinkingProvider(null);
    }
  };

  const handleUnlink = (provider: string) => {
    const account = externalAccounts.find((a) => a.provider === provider);
    if (!account) return;
    const totalAuth = externalAccounts.length + (user?.passwordEnabled ? 1 : 0);
    if (totalAuth <= 1) {
      Alert.alert(t('settings.error'), t('settings.cannotUnlinkLast'));
      return;
    }
    Alert.alert(
      t('settings.unlinkAccount'),
      t('settings.unlinkConfirm', { provider: providerLabel(provider) }),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('settings.unlinkConfirmBtn'),
          style: 'destructive',
          onPress: async () => {
            setLinkingProvider(provider);
            try {
              await account.destroy();
              await user?.reload();
            } catch {
              Alert.alert(t('settings.error'), t('settings.linkFailed'));
            } finally {
              setLinkingProvider(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return t('settings.never');
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteAccount'),
      t('settings.deleteAccountConfirm'),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAccount'),
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await user?.delete();
              await signOut();
            } catch {
              Alert.alert(t('settings.error'), t('settings.deleteAccountWarning'));
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

  const providerLabel = (provider: string) => {
    if (provider === 'google') return 'Google';
    if (provider === 'apple') return 'Apple';
    if (provider === 'facebook') return 'Facebook';
    if (provider === 'email') return t('settings.emailPassword');
    return provider;
  };

  const cardStyle = {
    borderRadius: 16,
    marginBottom: DIMENSIONS.SPACING,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.borderPrimary,
    padding: DIMENSIONS.SPACING,
  };

  const iconBoxStyle = {
    width: DIMENSIONS.SCREEN_WIDTH * 0.11,
    height: DIMENSIONS.SCREEN_WIDTH * 0.11,
    borderRadius: 12,
    backgroundColor: colors.cardBackgroundSecondary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: DIMENSIONS.SPACING * 0.8,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  };

  const providers: { key: string; strategy: OAuthStrategy; icon: any; label: string; iosOnly?: boolean }[] = [
    { key: 'google', strategy: 'oauth_google', icon: 'logo-google', label: 'Google' },
    { key: 'apple', strategy: 'oauth_apple', icon: 'logo-apple', label: 'Apple', iosOnly: true },
    { key: 'facebook', strategy: 'oauth_facebook', icon: 'logo-facebook', label: 'Facebook' },
  ];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.backgroundPrimary }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: DIMENSIONS.CARD_PADDING,
        paddingTop: DIMENSIONS.SPACING * 0.8,
        paddingBottom: DIMENSIONS.SPACING * 0.6,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{
            width: DIMENSIONS.SCREEN_WIDTH * 0.1, height: DIMENSIONS.SCREEN_WIDTH * 0.1,
            borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.05,
            backgroundColor: colors.cardBackground,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: colors.borderSecondary,
          }}
        >
          <Ionicons name="arrow-back" size={TYPOGRAPHY.body} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{
          fontSize: TYPOGRAPHY.title, fontWeight: '900',
          color: colors.textPrimary, marginLeft: DIMENSIONS.SPACING * 0.6,
        }}>
          {t('settings.accountSecurity')}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        <View style={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingTop: DIMENSIONS.SPACING * 0.4 }}>

          {/* ── Linked Accounts ── */}
          <Text style={{
            fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700',
            color: colors.textPrimary, opacity: 0.5,
            marginBottom: DIMENSIONS.SPACING * 0.6,
            textTransform: 'uppercase', letterSpacing: 1,
          }}>
            {t('settings.linkedAccounts')}
          </Text>

          <View style={cardStyle}>
            {!isLoaded ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              providers
                .filter(p => !p.iosOnly || Platform.OS === 'ios')
                .map((p, idx, arr) => (
                  <View key={p.key}>
                    {idx > 0 && (
                      <View style={{ height: 1, backgroundColor: colors.borderSecondary, marginVertical: DIMENSIONS.SPACING * 0.8 }} />
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={iconBoxStyle}>
                        <Ionicons name={p.icon} size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.textPrimary }}>
                          {p.label}
                        </Text>
                        <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary }}>
                          {isLinked(p.key)
                            ? externalAccounts.find(a => a.provider === p.key)?.emailAddress || t('settings.linked')
                            : t('settings.notLinked')}
                        </Text>
                      </View>
                      {linkingProvider === p.key ? (
                        <ActivityIndicator color={colors.textPrimary} size="small" />
                      ) : isLinked(p.key) ? (
                        <TouchableOpacity
                          onPress={() => handleUnlink(p.key)}
                          style={{
                            paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
                            borderWidth: 1, borderColor: colors.borderSecondary,
                          }}
                        >
                          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textPrimary, opacity: 0.6 }}>
                            {t('settings.unlink')}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={() => handleLink(p.strategy)}
                          style={{
                            paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
                            backgroundColor: colors.textPrimary,
                          }}
                        >
                          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.backgroundPrimary }}>
                            {t('settings.link')}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
            )}
          </View>

          <Text style={{
            fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600',
            color: colors.textPrimary, opacity: 0.4,
            marginBottom: DIMENSIONS.SPACING,
            lineHeight: TYPOGRAPHY.bodyXXS * 1.6,
          }}>
            {t('settings.linkedAccountsHint')}
          </Text>

          {/* ── Security ── */}
          <Text style={{
            fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700',
            color: colors.textPrimary, opacity: 0.5,
            marginBottom: DIMENSIONS.SPACING * 0.6,
            textTransform: 'uppercase', letterSpacing: 1,
          }}>
            {t('settings.security')}
          </Text>

          <View style={cardStyle}>
            <TouchableOpacity
              onPress={() => Alert.alert(t('settings.changePassword'), t('settings.changePasswordDescription'))}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={iconBoxStyle}>
                  <Ionicons name="key-outline" size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                    {t('settings.changePassword')}
                  </Text>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary }}>
                    {t('settings.changePasswordDescription')}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={TYPOGRAPHY.body} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* ── Login History ── */}
          <Text style={{
            fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700',
            color: colors.textPrimary, opacity: 0.5,
            marginBottom: DIMENSIONS.SPACING * 0.6,
            textTransform: 'uppercase', letterSpacing: 1,
          }}>
            {t('settings.loginHistory')}
          </Text>

          <View style={cardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 0.8 }}>
              <View style={iconBoxStyle}>
                <Ionicons name="time-outline" size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.textPrimary }}>
                  {t('settings.lastSignIn')}
                </Text>
                <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary }}>
                  {formatDate(user?.lastSignInAt)}
                </Text>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: colors.borderSecondary, marginBottom: DIMENSIONS.SPACING * 0.8 }} />

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={iconBoxStyle}>
                <Ionicons name="person-add-outline" size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.textPrimary }}>
                  {t('settings.accountCreated')}
                </Text>
                <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary }}>
                  {formatDate(user?.createdAt)}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Danger Zone ── */}
          <Text style={{
            fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700',
            color: '#ef4444', opacity: 0.8,
            marginBottom: DIMENSIONS.SPACING * 0.6,
            textTransform: 'uppercase', letterSpacing: 1,
          }}>
            {t('settings.dangerZone')}
          </Text>

          <View style={{ ...cardStyle, borderColor: '#ef444440' }}>
            <TouchableOpacity
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
              disabled={deletingAccount}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={{ ...iconBoxStyle, backgroundColor: '#ef444420', borderColor: '#ef444440' }}>
                  {deletingAccount
                    ? <ActivityIndicator color="#ef4444" size="small" />
                    : <Ionicons name="trash-outline" size={TYPOGRAPHY.iconS} color="#ef4444" />
                  }
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: '#ef4444', marginBottom: 4 }}>
                    {t('settings.deleteAccount')}
                  </Text>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary }}>
                    {t('settings.deleteAccountDescription')}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={TYPOGRAPHY.body} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
