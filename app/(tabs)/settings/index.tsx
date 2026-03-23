import { View, Text, ScrollView, TouchableOpacity, Alert, Platform, Linking, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/store/useStore';
import { LanguageCode, languageNames } from '@/i18n/locales';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@clerk/clerk-expo';
import {
  requestNotificationPermissions,
  scheduleDailyMealReminders,
  cancelAllNotifications,
  getNotificationPermissionStatus,
} from '@/services/notifications';
import { requestHealthPermissions, syncHealthData } from '@/services/health';
import UserProfileCard from '@/components/settings/UserProfileCard';
import SettingItem from '@/components/settings/SettingItem';
import GoalsModal from '@/components/settings/GoalsModal';
import LanguageModal from '@/components/settings/LanguageModal';
import LanguageChangeLoadingModal from '@/components/settings/LanguageChangeLoadingModal';
import EditProfileModal from '@/components/settings/EditProfileModal';

export default function SettingsScreen() {
  const {
    user,
    language,
    setLanguage: setStoreLanguage,
    setUser,
    themeMode,
    setThemeMode,
    dailyCalorieGoal,
    dailyStepGoal,
    setDailyCalorieGoal,
    setDailyStepGoal,
  } = useStore();
  const { t } = useTranslation();
  const colors = useTheme();
  const router = useRouter();
  const { signOut } = useAuth();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [healthConnected, setHealthConnected] = useState(false);
  const [healthSyncing, setHealthSyncing] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  const languages: LanguageCode[] = ['zh-CN', 'en-US', 'zh-TW', 'ja-JP', 'ko-KR'];
  const currentLanguageName = languageNames[language];

  const appState = useRef(AppState.currentState);

  // Check notification permission on mount and when app returns to foreground
  useEffect(() => {
    getNotificationPermissionStatus().then(setNotificationsEnabled);

    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        getNotificationPermissionStatus().then(setNotificationsEnabled);
      }
      appState.current = nextState;
    });

    return () => sub.remove();
  }, []);

  const handleSaveGoals = (
    goals: { dailyCalorieGoal: number; dailyStepGoal: number },
    body: Partial<{ height?: number; weight?: number; age?: number; gender?: string; goal?: string; exerciseFrequency?: string }>,
  ) => {
    setDailyCalorieGoal(goals.dailyCalorieGoal);
    setDailyStepGoal(goals.dailyStepGoal);
    if (Object.keys(body).length > 0) {
      setUser({ ...user, ...body } as any);
    }
    setShowGoalsModal(false);
    Alert.alert(t('settings.success'), t('settings.goalsUpdated'));
  };

  const handleNotificationsToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (granted) {
        await scheduleDailyMealReminders();
        setNotificationsEnabled(true);
        Alert.alert(t('settings.success'), '已开启每日餐食提醒（早8点、午12点、晚7点）');
      } else {
        Alert.alert(
          '需要通知权限',
          '请前往系统设置开启通知权限',
          [
            { text: '取消', style: 'cancel' },
            { text: '去设置', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } else {
      await cancelAllNotifications();
      setNotificationsEnabled(false);
    }
  };

  const handleHealthConnect = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Apple Health', '仅支持 iOS 设备');
      return;
    }
    setHealthSyncing(true);
    try {
      const granted = await requestHealthPermissions();
      if (granted) {
        await syncHealthData();
        setHealthConnected(true);
        Alert.alert('已连接', 'Apple Health 数据已同步');
      } else {
        Alert.alert(
          '需要权限',
          '请前往系统设置开启健康权限',
          [
            { text: '取消', style: 'cancel' },
            { text: '去设置', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } finally {
      setHealthSyncing(false);
    }
  };

  const handleLanguageChange = async (langCode: LanguageCode) => {
    if (langCode === language) {
      setShowLanguageModal(false);
      return;
    }

    setIsChangingLanguage(true);
    setShowLanguageModal(false);

    await new Promise(resolve => setTimeout(resolve, 800));

    setStoreLanguage(langCode);
    setIsChangingLanguage(false);

    const newTranslations = require('@/i18n/locales').translations[langCode];
    Alert.alert(
      newTranslations.settings.languageChanged || '语言已切换',
      (newTranslations.settings.languageUpdated || '语言已更新为') + ' ' + languageNames[langCode]
    );
  };

  return (
    <SafeAreaView className="flex-1" edges={['top', 'left', 'right']} style={{ backgroundColor: colors.backgroundPrimary }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View style={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingTop: DIMENSIONS.SPACING * 0.8 }}>
          <UserProfileCard
            user={user}
            themeMode={themeMode === 'auto' ? 'dark' : themeMode}
            onThemeChange={(mode) => setThemeMode(mode)}
            onEdit={() => setShowEditProfileModal(true)}
          />

          <SettingItem
            icon="flag"
            title={t('settings.goals')}
            description={t('settings.dailyGoalsSummary', { calories: String(dailyCalorieGoal), steps: String(dailyStepGoal) })}
            onPress={() => setShowGoalsModal(true)}
          />

          <SettingItem
            icon="language"
            title={t('settings.language')}
            value={currentLanguageName}
            onPress={() => setShowLanguageModal(true)}
          />

          <SettingItem
            icon="notifications"
            title={t('settings.notifications')}
            showSwitch={true}
            switchValue={notificationsEnabled}
            onSwitchChange={handleNotificationsToggle}
            showChevron={false}
          />

          {Platform.OS === 'ios' && (
            <SettingItem
              icon="heart"
              title="Apple Health"
              description={healthConnected ? '已连接 · 步数、消耗热量同步中' : '连接后可同步步数和运动数据'}
              onPress={healthSyncing ? undefined : handleHealthConnect}
              value={healthConnected ? '已连接' : undefined}
            />
          )}

          <SettingItem
            icon="shield-checkmark"
            title={t('settings.accountSecurity')}
            description={t('settings.accountSecurityDescription')}
            onPress={() => router.push('/(tabs)/settings/account-security')}
          />

          <SettingItem
            icon="card-outline"
            title={t('settings.subscriptionPlan')}
            description={t('settings.subscriptionPlanDescription')}
            onPress={() => Alert.alert(t('settings.subscriptionPlan'), t('settings.subscriptionPlanDescription'))}
          />

          {/* About Section */}
          <View
            style={{
              borderRadius: 16,
              marginBottom: DIMENSIONS.SPACING,
              backgroundColor: colors.cardBackground,
              borderWidth: 2,
              borderColor: colors.borderPrimary,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: DIMENSIONS.SPACING,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderPrimary,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="download" size={TYPOGRAPHY.body} color={colors.textPrimary} style={{ marginRight: DIMENSIONS.SPACING * 0.6 }} />
                <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.textPrimary }}>
                  {t('settings.exportData')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={TYPOGRAPHY.body} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: DIMENSIONS.SPACING,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="information-circle" size={TYPOGRAPHY.body} color={colors.textPrimary} style={{ marginRight: DIMENSIONS.SPACING * 0.6 }} />
                <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.textPrimary }}>
                  {t('settings.about')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={TYPOGRAPHY.body} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Legal */}
          <View
            style={{
              borderRadius: 16,
              marginBottom: DIMENSIONS.SPACING,
              backgroundColor: colors.cardBackground,
              borderWidth: 2,
              borderColor: colors.borderPrimary,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: DIMENSIONS.SPACING,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderPrimary,
              }}
            >
              <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.textPrimary }}>
                {t('settings.privacyPolicy')}
              </Text>
              <Ionicons name="chevron-forward" size={TYPOGRAPHY.body} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: DIMENSIONS.SPACING,
              }}
            >
              <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.textPrimary }}>
                {t('settings.termsOfService')}
              </Text>
              <Ionicons name="chevron-forward" size={TYPOGRAPHY.body} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <TouchableOpacity
            onPress={() => {
              Alert.alert(t('settings.logout'), t('settings.confirmLogout'), [
                { text: t('settings.cancel'), style: 'cancel' },
                {
                  text: t('settings.logoutConfirm'),
                  style: 'destructive',
                  onPress: async () => {
                    await signOut();
                    const { clearSession } = useStore.getState();
                    clearSession();
                    router.replace('/(auth)/login');
                  },
                },
              ]);
            }}
            activeOpacity={0.7}
            style={{
              borderRadius: 24,
              paddingVertical: DIMENSIONS.SPACING,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: DIMENSIONS.SPACING * 0.4,
              marginBottom: DIMENSIONS.SPACING * 1.2,
              minHeight: 56,
              backgroundColor: colors.cardBackground,
              borderWidth: 2,
              borderColor: colors.borderPrimary,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="log-out" size={TYPOGRAPHY.title} color="#EF4444" />
              <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', marginLeft: DIMENSIONS.SPACING * 0.4, color: "#EF4444" }}>
                {t('settings.logout')}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={{ paddingVertical: DIMENSIONS.SPACING * 0.8, alignItems: 'center' }}>
            <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '600', color: colors.textPrimary, opacity: 0.7 }}>
              Lock v1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>

      <GoalsModal
        visible={showGoalsModal}
        user={user}
        dailyCalorieGoal={dailyCalorieGoal}
        dailyStepGoal={dailyStepGoal}
        onSave={handleSaveGoals}
        onCancel={() => setShowGoalsModal(false)}
      />

      <LanguageModal
        visible={showLanguageModal}
        currentLanguage={language}
        languages={languages}
        onLanguageSelect={handleLanguageChange}
        onClose={() => setShowLanguageModal(false)}
      />

      <LanguageChangeLoadingModal visible={isChangingLanguage} />

      <EditProfileModal
        visible={showEditProfileModal}
        user={user}
        onSave={(updated) => {
          setUser({ ...user, ...updated } as any);
          setShowEditProfileModal(false);
        }}
        onCancel={() => setShowEditProfileModal(false)}
      />
    </SafeAreaView>
  );
}
