import { ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import Constants from 'expo-constants';
import { Text } from '@/components/ui/Text';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { languageNames } from '@/i18n/locales';
import { useTheme } from '@/hooks/useTheme';
import { FONTS } from '@/constants/fonts';
import { Appear, ScreenHeader } from '@/components/ui/bxc';
import SettingItem from '@/components/settings/SettingItem';
import { useTabBarInset } from '@/hooks/useTabBarInset';
import { useDeviceLayout } from '@/hooks/useDeviceLayout';
import { View } from 'react-native';
import { SETTINGS_TOP_ROW } from '@/components/settings/settingsSplit';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

/** The Settings categories, each with the pages it leads to (for highlighting). */
export function useSettingsGroups() {
  const { language, dailyCalorieGoal } = useStore();
  const { t } = useTranslation();
  return [
    { key: 'goals', pages: ['weight-tracker'], icon: 'flag-outline', title: t('settings.groupGoals' as any), description: `${dailyCalorieGoal.toLocaleString()} kcal · ${t('settings.weightTracker' as any)}`, route: '/(tabs)/settings/goals' },
    { key: 'preferences', pages: ['app-icon'], icon: 'options-outline', title: t('settings.groupPreferences' as any), description: `${languageNames[language]} · ${t('settings.appIcon')} · ${t('settings.notifications')}`, route: '/(tabs)/settings/preferences' },
    { key: 'friends', pages: ['contacts', 'blocked-users'], icon: 'people-outline', title: t('settings.groupFriends' as any), description: `${t('settings.contacts' as any)} · ${t('block.blockedUsers')}`, route: '/(tabs)/settings/friends' },
    { key: 'account', pages: ['account-security', 'pricing', 'export-data'], icon: 'person-circle-outline', title: t('settings.groupAccount' as any), description: `${t('settings.accountSecurity')} · ${t('settings.subscriptionPlan')}`, route: '/(tabs)/settings/account' },
    { key: 'about', pages: ['privacy-policy', 'terms-of-service'], icon: 'information-circle-outline', title: t('settings.about'), description: t('settings.aboutDescription'), route: '/(tabs)/settings/about' },
  ];
}

/** Log out button and the version line under the Settings list. */
export function SettingsFooter() {
  const { t } = useTranslation();
  const colors = useTheme();
  const router = useRouter();
  const { signOut } = useAuth();
  return (
    <>
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
        activeOpacity={0.8}
        accessibilityRole="button"
        style={{
          minHeight: 52, borderRadius: 14, borderWidth: 2, borderColor: colors.danger,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8,
        }}
      >
        <Ionicons name="log-out-outline" size={19} color={colors.danger} />
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.danger }}>{t('settings.logout')}</Text>
      </TouchableOpacity>

      <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 16, marginBottom: 8 }}>
        LOCK v{APP_VERSION}
      </Text>
    </>
  );
}

/**
 * Open iPhone Duo: the Settings list stays on the right page (bottom half when
 * turned a quarter) while the chosen category, and anything it opens, shows on
 * the other half — like Settings on an iPad. The open category is highlighted.
 */
export default function SettingsMenu() {
  const { t } = useTranslation();
  const colors = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const tabInset = useTabBarInset();
  const groups = useSettingsGroups();
  const { fold } = useDeviceLayout();
  // Side by side: start level with the pages' titles on the left page.
  // Turned a quarter the list is the bottom half and needs no title.
  const side = fold?.axis !== 'horizontal';
  const page = pathname.split('/').filter(Boolean).pop() ?? '';
  const active = groups.find((g) => g.key === page || g.pages.includes(page))?.key;

  const open = (g: (typeof groups)[number]) => {
    if (page === g.key) return;
    // Back to the Settings home first, so the right page doesn't pile up
    // one category on top of another.
    if (page !== 'settings' && router.canDismiss()) router.dismissAll();
    router.push(g.route as any);
  };

  return (
    <SafeAreaView edges={['top', 'right']} style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: side ? 0 : 22, paddingBottom: tabInset }}>
        {side ? (
          <>
            <View style={{ height: SETTINGS_TOP_ROW }} />
            <ScreenHeader title={t('settings.title' as any)} style={{ marginTop: 0 }} />
          </>
        ) : null}
        {groups.map((g, i) => (
          <Appear key={g.key} index={i}>
            <SettingItem icon={g.icon} title={g.title} description={g.description} selected={active === g.key} onPress={() => open(g)} />
          </Appear>
        ))}
        <SettingsFooter />
      </ScrollView>
    </SafeAreaView>
  );
}
