import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import Constants from 'expo-constants';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function AboutScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { t } = useTranslation();
  const [currentIcon, setCurrentIcon] = React.useState<'dark' | 'light'>('dark');

  const handleIconChange = async (icon: 'dark' | 'light') => {
    if (icon === currentIcon) return;
    try {
      const AlternateAppIcons = require('expo-alternate-app-icons');
      await AlternateAppIcons.setAlternateAppIconAsync(icon === 'light' ? 'WhiteLockin' : 'DarkLockin');
      setCurrentIcon(icon);
    } catch {
      // Requires a native build; silently ignore in Expo Go
    }
  };

  const rows: { icon: any; label: string; onPress: () => void }[] = [
    {
      icon: 'shield-outline',
      label: t('about.privacyPolicy'),
      onPress: () => router.push('/(tabs)/settings/privacy-policy'),
    },
    {
      icon: 'document-text-outline',
      label: t('about.termsOfService'),
      onPress: () => router.push('/(tabs)/settings/terms-of-service'),
    },
    {
      icon: 'mail-outline',
      label: t('about.contact'),
      onPress: () => Linking.openURL(`mailto:${t('about.contactEmail')}`),
    },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: DIMENSIONS.CARD_PADDING,
        paddingVertical: DIMENSIONS.SPACING,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: DIMENSIONS.SPACING }}>
          <Ionicons name="chevron-back" size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: colors.textPrimary }}>
          {t('about.title')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* App icon + name */}
        <View style={{ alignItems: 'center', paddingVertical: DIMENSIONS.SPACING * 2 }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            backgroundColor: colors.cardBackground,
            borderWidth: 2,
            borderColor: colors.borderPrimary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: DIMENSIONS.SPACING,
          }}>
            <Ionicons name="lock-closed" size={40} color={colors.textPrimary} />
          </View>
          <Text style={{ fontSize: TYPOGRAPHY.title, fontWeight: '900', color: colors.textPrimary }}>
            Lock
          </Text>
          <Text style={{ fontSize: TYPOGRAPHY.bodyS, color: colors.textSecondary, marginTop: 4 }}>
            {t('about.version')} {APP_VERSION}
          </Text>
        </View>

        {/* Description */}
        <View style={{
          backgroundColor: colors.cardBackground,
          borderRadius: 16,
          padding: DIMENSIONS.CARD_PADDING,
          borderWidth: 1,
          borderColor: colors.borderPrimary,
          marginBottom: DIMENSIONS.SPACING * 1.5,
        }}>
          <Text style={{
            fontSize: TYPOGRAPHY.bodyS,
            color: colors.textSecondary,
            lineHeight: TYPOGRAPHY.bodyS * 1.7,
          }}>
            {t('about.description')}
          </Text>
        </View>

        {/* App Icon Switcher */}
        <Text style={{
          fontSize: TYPOGRAPHY.bodyXS,
          fontWeight: '700',
          color: colors.textSecondary,
          marginBottom: DIMENSIONS.SPACING * 0.5,
          paddingLeft: 4,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}>
          {t('settings.appIcon')}
        </Text>
        <View style={{
          backgroundColor: colors.cardBackground,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.borderPrimary,
          padding: DIMENSIONS.CARD_PADDING,
          marginBottom: DIMENSIONS.SPACING * 1.5,
          flexDirection: 'row',
          gap: DIMENSIONS.SPACING * 0.8,
        }}>
          {(['dark', 'light'] as const).map((icon) => {
            const isSelected = currentIcon === icon;
            return (
              <TouchableOpacity
                key={icon}
                onPress={() => handleIconChange(icon)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  gap: DIMENSIONS.SPACING * 0.4,
                  padding: DIMENSIONS.SPACING * 0.6,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: isSelected ? colors.textPrimary : colors.borderPrimary,
                  backgroundColor: isSelected ? colors.cardBackgroundSecondary : 'transparent',
                }}
              >
                <Image
                  source={icon === 'dark'
                    ? require('@/assets/dark-lockin.png')
                    : require('@/assets/white-lockin.png')}
                  style={{ width: 60, height: 60, borderRadius: 14 }}
                />
                <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '600', color: colors.textPrimary }}>
                  {icon === 'dark' ? t('settings.appIconDark') : t('settings.appIconLight')}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.textPrimary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legal section */}
        <Text style={{
          fontSize: TYPOGRAPHY.bodyXS,
          fontWeight: '700',
          color: colors.textSecondary,
          marginBottom: DIMENSIONS.SPACING * 0.5,
          paddingLeft: 4,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}>
          {t('about.legal')}
        </Text>

        <View style={{
          backgroundColor: colors.cardBackground,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.borderPrimary,
          overflow: 'hidden',
          marginBottom: DIMENSIONS.SPACING * 1.5,
        }}>
          {rows.map((row, index) => (
            <TouchableOpacity
              key={row.label}
              onPress={row.onPress}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: DIMENSIONS.CARD_PADDING,
                paddingVertical: DIMENSIONS.SPACING * 0.9,
                borderBottomWidth: index < rows.length - 1 ? 1 : 0,
                borderBottomColor: colors.borderPrimary,
              }}
            >
              <Ionicons name={row.icon} size={TYPOGRAPHY.iconS} color={colors.textSecondary} />
              <Text style={{
                flex: 1,
                fontSize: TYPOGRAPHY.bodyS,
                fontWeight: '600',
                color: colors.textPrimary,
                marginLeft: DIMENSIONS.SPACING * 0.8,
              }}>
                {row.label}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={{ alignItems: 'center', paddingTop: DIMENSIONS.SPACING }}>
          <Text style={{ fontSize: TYPOGRAPHY.bodyXS, color: colors.textSecondary, opacity: 0.6 }}>
            {t('about.madeWith')}
          </Text>
          <Text style={{ fontSize: TYPOGRAPHY.bodyXS, color: colors.textSecondary, opacity: 0.5, marginTop: 4 }}>
            {t('about.copyright')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
