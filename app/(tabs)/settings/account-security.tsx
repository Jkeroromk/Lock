import { View, Text, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';

export default function AccountSecurityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [dataSharingEnabled, setDataSharingEnabled] = useState(true);
  const [healthConnectionStatus, setHealthConnectionStatus] = useState<'connected' | 'disconnected'>('connected');
  const healthSourceLabel = Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit';

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.backgroundPrimary }}>
      {/* 返回按钮 */}
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
          onPress={() => router.push('/(tabs)/settings')}
          activeOpacity={0.7}
          style={{
            width: DIMENSIONS.SCREEN_WIDTH * 0.1,
            height: DIMENSIONS.SCREEN_WIDTH * 0.1,
            borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.05,
            backgroundColor: COLORS.cardBackground,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: COLORS.borderSecondary,
          }}
        >
          <Ionicons name="arrow-back" size={TYPOGRAPHY.body} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: TYPOGRAPHY.title,
            fontWeight: '900',
            color: COLORS.textPrimary,
            marginLeft: DIMENSIONS.SPACING * 0.6,
          }}
        >
          {t('settings.accountSecurity')}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingBottom: Platform.OS === 'ios' ? 20 : 30,
          flexGrow: 1,
          backgroundColor: COLORS.backgroundPrimary,
        }}
        style={{ backgroundColor: COLORS.backgroundPrimary }}
      >
        <View style={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingTop: DIMENSIONS.SPACING * 0.4 }}>
          {/* Change Password */}
          <View
            style={{
              borderRadius: 16,
              marginBottom: DIMENSIONS.SPACING,
              backgroundColor: COLORS.cardBackground,
              borderWidth: 2,
              borderColor: COLORS.borderPrimary,
              padding: DIMENSIONS.SPACING,
            }}
          >
            <TouchableOpacity
              onPress={() => Alert.alert(t('settings.changePassword'), t('settings.accountSecurityDescription'))}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View
                  style={{
                    width: DIMENSIONS.SCREEN_WIDTH * 0.11,
                    height: DIMENSIONS.SCREEN_WIDTH * 0.11,
                    borderRadius: 12,
                    backgroundColor: COLORS.cardBackgroundSecondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: DIMENSIONS.SPACING * 0.8,
                    borderWidth: 1,
                    borderColor: COLORS.borderSecondary,
                  }}
                >
                  <Ionicons name="key-outline" size={TYPOGRAPHY.iconS} color={COLORS.textPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 }}>
                    {t('settings.changePassword')}
                  </Text>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: COLORS.textSecondary }}>
                    {t('settings.accountSecurityDescription')}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={TYPOGRAPHY.body} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Two-Factor Authentication */}
          <View
            style={{
              borderRadius: 16,
              marginBottom: DIMENSIONS.SPACING,
              backgroundColor: COLORS.cardBackground,
              borderWidth: 2,
              borderColor: COLORS.borderPrimary,
              padding: DIMENSIONS.SPACING,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: DIMENSIONS.SCREEN_WIDTH * 0.11,
                  height: DIMENSIONS.SCREEN_WIDTH * 0.11,
                  borderRadius: 12,
                  backgroundColor: COLORS.cardBackgroundSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: DIMENSIONS.SPACING * 0.8,
                  borderWidth: 1,
                  borderColor: COLORS.borderSecondary,
                }}
              >
                <Ionicons name="finger-print-outline" size={TYPOGRAPHY.iconS} color={COLORS.textPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 }}>
                  {t('settings.enableTwoFactor')}
                </Text>
                <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: COLORS.textSecondary }}>
                  {twoFactorEnabled ? t('settings.twoFactorEnabled') : t('settings.twoFactorDisabled')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  const newValue = !twoFactorEnabled;
                  setTwoFactorEnabled(newValue);
                  Alert.alert(t('settings.enableTwoFactor'), newValue ? t('settings.twoFactorEnabled') : t('settings.twoFactorDisabled'));
                }}
                style={{
                  width: 50,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: twoFactorEnabled ? COLORS.textPrimary : COLORS.cardBackgroundSecondary,
                  justifyContent: 'center',
                  alignItems: twoFactorEnabled ? 'flex-end' : 'flex-start',
                  paddingHorizontal: 4,
                  borderWidth: 1,
                  borderColor: COLORS.borderSecondary,
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: twoFactorEnabled ? COLORS.backgroundPrimary : COLORS.textSecondary,
                  }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Privacy Controls */}
          <View
            style={{
              borderRadius: 16,
              marginBottom: DIMENSIONS.SPACING,
              backgroundColor: COLORS.cardBackground,
              borderWidth: 2,
              borderColor: COLORS.borderPrimary,
              padding: DIMENSIONS.SPACING,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: DIMENSIONS.SCREEN_WIDTH * 0.11,
                  height: DIMENSIONS.SCREEN_WIDTH * 0.11,
                  borderRadius: 12,
                  backgroundColor: COLORS.cardBackgroundSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: DIMENSIONS.SPACING * 0.8,
                  borderWidth: 1,
                  borderColor: COLORS.borderSecondary,
                }}
              >
                <Ionicons name="lock-closed" size={TYPOGRAPHY.iconS} color={COLORS.textPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 }}>
                  {t('settings.privacyControls')}
                </Text>
                <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: COLORS.textSecondary }}>
                  {t('settings.privacyControlsDescription')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  const newValue = !dataSharingEnabled;
                  setDataSharingEnabled(newValue);
                }}
                style={{
                  width: 50,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: dataSharingEnabled ? COLORS.textPrimary : COLORS.cardBackgroundSecondary,
                  justifyContent: 'center',
                  alignItems: dataSharingEnabled ? 'flex-end' : 'flex-start',
                  paddingHorizontal: 4,
                  borderWidth: 1,
                  borderColor: COLORS.borderSecondary,
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: dataSharingEnabled ? COLORS.backgroundPrimary : COLORS.textSecondary,
                  }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Health Data */}
          <View
            style={{
              borderRadius: 16,
              marginBottom: DIMENSIONS.SPACING,
              backgroundColor: COLORS.cardBackground,
              borderWidth: 2,
              borderColor: COLORS.borderPrimary,
              padding: DIMENSIONS.SPACING,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                const nextStatus = healthConnectionStatus === 'connected' ? 'disconnected' : 'connected';
                setHealthConnectionStatus(nextStatus);
                Alert.alert(
                  t('settings.healthConnections'),
                  nextStatus === 'connected'
                    ? t('settings.connectionEnabled')
                    : t('settings.connectionDisabled')
                );
              }}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View
                  style={{
                    width: DIMENSIONS.SCREEN_WIDTH * 0.11,
                    height: DIMENSIONS.SCREEN_WIDTH * 0.11,
                    borderRadius: 12,
                    backgroundColor: COLORS.cardBackgroundSecondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: DIMENSIONS.SPACING * 0.8,
                    borderWidth: 1,
                    borderColor: COLORS.borderSecondary,
                  }}
                >
                  <Ionicons name="fitness" size={TYPOGRAPHY.iconS} color={COLORS.textPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 }}>
                    {t('settings.healthConnections')}
                  </Text>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: COLORS.textSecondary }}>
                    {healthConnectionStatus === 'connected'
                      ? `${t('settings.connectedTo')} ${healthSourceLabel}`
                      : t('settings.notConnected')}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={TYPOGRAPHY.body} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

