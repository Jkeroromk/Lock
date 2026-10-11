import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useStore, type ThemeMode } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { LanguageCode, languageNames } from '@/i18n/locales';
import {
  requestNotificationPermissions, scheduleDailyMealReminders, cancelAllNotifications, getNotificationPermissionStatus,
} from '@/services/notifications';
import {
  requestHealthPermissions, syncHealthData, isHealthConnected, isHealthAvailable, HEALTH_APP_URL,
} from '@/services/health';
import { getAppIconOption, getCurrentAppIcon } from '@/lib/appIcon';
import { Segmented } from '@/components/ui/bxc';
import SettingItem from '@/components/settings/SettingItem';
import SettingsPage, { SettingsSection } from '@/components/settings/SettingsPage';
import LanguageModal from '@/components/settings/LanguageModal';
import LanguageChangeLoadingModal from '@/components/settings/LanguageChangeLoadingModal';

/** Language, appearance, app icon, notifications and Apple Health. */
export default function PreferencesScreen() {
  const { language, setLanguage, themeMode, setThemeMode, calorieWarnings, setCalorieWarnings } = useStore();
  const { t } = useTranslation();
  const router = useRouter();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [healthConnected, setHealthConnected] = useState(false);
  const [healthSyncing, setHealthSyncing] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [appIconLabel, setAppIconLabel] = useState(() => getAppIconOption(getCurrentAppIcon()).labelKey);

  // Refresh when coming back from the icon picker.
  useFocusEffect(useCallback(() => {
    setAppIconLabel(getAppIconOption(getCurrentAppIcon()).labelKey);
  }, []));

  // Notification permission can change in iOS Settings while we're backgrounded.
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    isHealthConnected().then(setHealthConnected);
    getNotificationPermissionStatus().then(setNotificationsEnabled);
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        getNotificationPermissionStatus().then(setNotificationsEnabled);
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  const openSettingsAlert = (title: string, body: string) => Alert.alert(title, body, [
    { text: t('settings.cancel'), style: 'cancel' },
    { text: t('settings.openSettings' as any), onPress: () => Linking.openSettings() },
  ]);

  const handleNotificationsToggle = async (value: boolean) => {
    if (!value) {
      await cancelAllNotifications();
      setNotificationsEnabled(false);
      return;
    }
    const granted = await requestNotificationPermissions();
    if (granted) {
      await scheduleDailyMealReminders();
      setNotificationsEnabled(true);
    } else {
      openSettingsAlert(t('settings.notifications'), t('settings.notificationDescription'));
    }
  };

  // iOS keeps Health permissions in the Health app, not in this app's page in
  // Settings, so point people there instead of Linking.openSettings().
  const openHealthApp = () => Linking.openURL(HEALTH_APP_URL).catch(() => {});

  const showHealthManageHint = () => Alert.alert(t('settings.healthConnections'), t('settings.healthManageHint' as any), [
    { text: t('settings.cancel'), style: 'cancel' },
    { text: t('settings.openHealth' as any), onPress: openHealthApp },
  ]);

  const handleHealthConnect = async () => {
    if (!isHealthAvailable()) {
      Alert.alert(t('settings.healthConnections'), t('settings.healthUnavailable' as any));
      return;
    }
    if (healthConnected) {
      showHealthManageHint();
      return;
    }
    setHealthSyncing(true);
    try {
      const ok = await requestHealthPermissions();
      if (ok) {
        setHealthConnected(true);
        syncHealthData().catch(() => {});
      } else {
        showHealthManageHint();
      }
    } finally {
      setHealthSyncing(false);
    }
  };

  const handleLanguageChange = async (code: LanguageCode) => {
    setShowLanguageModal(false);
    if (code === language) return;
    setIsChangingLanguage(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setLanguage(code);
    setIsChangingLanguage(false);
  };

  const themeOptions: { key: ThemeMode; label: string }[] = [
    { key: 'light', label: t('settings.themeLight') },
    { key: 'dark', label: t('settings.themeDark') },
    { key: 'auto', label: t('settings.themeAuto' as any) },
  ];

  return (
    <SettingsPage title={t('settings.groupPreferences' as any)}>
      <SettingsSection label={t('settings.theme' as any)} />
      <Segmented value={themeMode} onChange={setThemeMode} options={themeOptions} style={{ marginBottom: 8 }} />

      <SettingsSection label={t('settings.groupGeneral' as any)} />
      <SettingItem
        icon="language"
        title={t('settings.language')}
        value={languageNames[language]}
        onPress={() => setShowLanguageModal(true)}
      />
      {Platform.OS === 'ios' && (
        <SettingItem
          icon="apps-outline"
          title={t('settings.appIcon')}
          value={t(appIconLabel)}
          onPress={() => router.push('/(tabs)/settings/app-icon')}
        />
      )}
      <SettingItem
        icon="notifications-outline"
        title={t('settings.notifications')}
        description={t('settings.notificationDescription')}
        showSwitch
        switchValue={notificationsEnabled}
        onSwitchChange={handleNotificationsToggle}
        showChevron={false}
      />
      <SettingItem
        icon="warning-outline"
        title={t('calorieWarn.setting' as any)}
        description={t('calorieWarn.settingDesc' as any)}
        showSwitch
        switchValue={calorieWarnings}
        onSwitchChange={setCalorieWarnings}
        showChevron={false}
      />

      {Platform.OS === 'ios' && (
        <>
          <SettingsSection label={t('settings.groupConnections' as any)} />
          <SettingItem
            icon="heart-outline"
            title={t('settings.healthConnections')}
            description={healthConnected ? t('settings.connectionEnabled') : t('settings.healthConnectionsDescription')}
            value={healthConnected ? t('settings.connectedTo') : undefined}
            onPress={healthSyncing ? undefined : handleHealthConnect}
          />
        </>
      )}

      <LanguageModal
        visible={showLanguageModal}
        currentLanguage={language}
        languages={[]}
        onLanguageSelect={handleLanguageChange}
        onClose={() => setShowLanguageModal(false)}
      />
      <LanguageChangeLoadingModal visible={isChangingLanguage} />
    </SettingsPage>
  );
}
