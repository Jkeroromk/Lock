import { View, Text, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { useUser, useOAuth } from '@clerk/clerk-expo';
import * as Linking from 'expo-linking';

export default function AccountSecurityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useTheme();
  const { user, isLoaded } = useUser();
  const { startOAuthFlow: googleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);

  const externalAccounts = user?.externalAccounts ?? [];
  const isLinked = (provider: string) =>
    externalAccounts.some((a) => a.provider === provider);

  const handleLinkGoogle = async () => {
    setLinkingProvider('google');
    try {
      const { createdSessionId } = await googleOAuth({
        redirectUrl: Linking.createURL('/', { scheme: 'lock' }),
      });
      if (createdSessionId) {
        await user?.reload();
        Alert.alert(t('settings.success'), t('settings.linkSuccess'));
      }
    } catch (err: any) {
      if (err.message !== 'cancelled') {
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

  const providerLabel = (provider: string) => {
    if (provider === 'google') return 'Google';
    if (provider === 'apple') return 'Apple';
    if (provider === 'email') return t('settings.emailPassword');
    return provider;
  };

  const providerIcon = (provider: string): any => {
    if (provider === 'google') return 'logo-google';
    if (provider === 'apple') return 'logo-apple';
    return 'mail-outline';
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

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.backgroundPrimary }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: DIMENSIONS.CARD_PADDING,
          paddingTop: DIMENSIONS.SPACING * 0.8,
          paddingBottom: DIMENSIONS.SPACING * 0.6,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{
            width: DIMENSIONS.SCREEN_WIDTH * 0.1,
            height: DIMENSIONS.SCREEN_WIDTH * 0.1,
            borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.05,
            backgroundColor: colors.cardBackground,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.borderSecondary,
          }}
        >
          <Ionicons name="arrow-back" size={TYPOGRAPHY.body} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: TYPOGRAPHY.title,
            fontWeight: '900',
            color: colors.textPrimary,
            marginLeft: DIMENSIONS.SPACING * 0.6,
          }}
        >
          {t('settings.accountSecurity')}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 20 : 30 }}
      >
        <View style={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingTop: DIMENSIONS.SPACING * 0.4 }}>

          {/* Linked Accounts */}
          <Text style={{
            fontSize: TYPOGRAPHY.bodyXS,
            fontWeight: '700',
            color: colors.textPrimary,
            opacity: 0.5,
            marginBottom: DIMENSIONS.SPACING * 0.6,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
            {t('settings.linkedAccounts')}
          </Text>

          <View style={cardStyle}>
            {!isLoaded ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <>
                {/* Email row — always shown */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 0.8 }}>
                  <View style={iconBoxStyle}>
                    <Ionicons name="mail-outline" size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.textPrimary }}>
                      {t('settings.emailPassword')}
                    </Text>
                    <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary }}>
                      {isLinked('email') ? t('settings.linked') : t('settings.notLinked')}
                    </Text>
                  </View>
                  {isLinked('email') && (
                    <View style={{
                      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
                      backgroundColor: colors.cardBackgroundSecondary,
                      borderWidth: 1, borderColor: colors.borderSecondary,
                    }}>
                      <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textPrimary }}>
                        {t('settings.linked')}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: colors.borderSecondary, marginBottom: DIMENSIONS.SPACING * 0.8 }} />

                {/* Google row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 0.8 }}>
                  <View style={iconBoxStyle}>
                    <Ionicons name="logo-google" size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.textPrimary }}>
                      Google
                    </Text>
                    <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary }}>
                      {isLinked('google') ? t('settings.linked') : t('settings.notLinked')}
                    </Text>
                  </View>
                  {linkingProvider === 'google' ? (
                    <ActivityIndicator color={colors.textPrimary} size="small" />
                  ) : isLinked('google') ? (
                    <TouchableOpacity
                      onPress={() => handleUnlink('google')}
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
                      onPress={handleLinkGoogle}
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

                {/* Apple row — iOS only */}
                {Platform.OS === 'ios' && (
                  <>
                    <View style={{ height: 1, backgroundColor: colors.borderSecondary, marginBottom: DIMENSIONS.SPACING * 0.8 }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={iconBoxStyle}>
                        <Ionicons name="logo-apple" size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.textPrimary }}>
                          Apple
                        </Text>
                        <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary }}>
                          {isLinked('apple') ? t('settings.linked') : t('settings.notLinked')}
                        </Text>
                      </View>
                      {isLinked('apple') ? (
                        <TouchableOpacity
                          onPress={() => handleUnlink('apple')}
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
                        <View style={{
                          paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
                          backgroundColor: colors.cardBackgroundSecondary,
                          borderWidth: 1, borderColor: colors.borderSecondary,
                        }}>
                          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textSecondary }}>
                            {t('settings.notLinked')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </>
                )}
              </>
            )}
          </View>

          {/* Separator */}
          <Text style={{
            fontSize: TYPOGRAPHY.bodyXXS,
            fontWeight: '600',
            color: colors.textPrimary,
            opacity: 0.4,
            marginBottom: DIMENSIONS.SPACING,
            lineHeight: TYPOGRAPHY.bodyXXS * 1.6,
          }}>
            {t('settings.linkedAccountsHint')}
          </Text>

          {/* Change Password */}
          <Text style={{
            fontSize: TYPOGRAPHY.bodyXS,
            fontWeight: '700',
            color: colors.textPrimary,
            opacity: 0.5,
            marginBottom: DIMENSIONS.SPACING * 0.6,
            textTransform: 'uppercase',
            letterSpacing: 1,
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
