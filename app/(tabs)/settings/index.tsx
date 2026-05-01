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
        Alert.alert(t('settings.success'), t('settings.notificationDescription'));
      } else {
        Alert.alert(
          t('settings.notifications'),
          t('settings.notificationDescription'),
          [
            { text: t('settings.cancel'), style: 'cancel' },
            { text: t('settings.syncHealthData'), onPress: () => Linking.openSettings() },
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
      Alert.alert('Apple Health', t('settings.healthConnectionsDescription'));
      return;
    }
    setHealthSyncing(true);
    try {
      const granted = await requestHealthPermissions();
      if (granted) {
        await syncHealthData();
        setHealthConnected(true);
        Alert.alert(t('settings.healthConnections'), t('settings.connectionEnabled'));
      } else {
        Alert.alert(
          t('settings.healthConnections'),
          t('settings.healthConnectionsDescription'),
          [
            { text: t('settings.cancel'), style: 'cancel' },
            { text: t('settings.syncHealthData'), onPress: () => Linking.openSettings() },
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
      newTranslations.settings.languageChanged,
      newTranslations.settings.languageUpdated + ' ' + languageNames[langCode]
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
            icon="people-outline"
            title={t('settings.contacts' as any)}
            description={t('settings.contactsDescription' as any)}
            onPress={() => router.push('/(tabs)/settings/contacts')}
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
              title={t('settings.healthConnections')}
              description={healthConnected ? t('settings.connectionEnabled') : t('settings.healthConnectionsDescription')}
              onPress={healthSyncing ? undefined : handleHealthConnect}
              value={healthConnected ? t('settings.connectedTo') : undefined}
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
            onPress={() => router.push('/(tabs)/settings/pricing')}
          />

          {user?.plan && user.plan !== 'FREE' && (
            <SettingItem
              icon="storefront-outline"
              title={t('settings.manageSubscription' as any)}
              description={t('settings.manageSubscriptionDescription' as any)}
              onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
            />
          )}

          <SettingItem
            icon="download-outline"
            title={t('settings.exportData')}
            description={t('settings.exportDataDescription')}
            onPress={() => router.push('/(tabs)/settings/export-data')}
          />

          <SettingItem
            icon="information-circle-outline"
            title={t('settings.about')}
            description={t('settings.aboutDescription')}
            onPress={() => router.push('/(tabs)/settings/about')}
          />

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
        languages={[]}
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
