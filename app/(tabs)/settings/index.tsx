import { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
import UserProfileCard from '@/components/settings/UserProfileCard';
import SettingItem from '@/components/settings/SettingItem';
import EditProfileModal from '@/components/settings/EditProfileModal';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

/**
 * Settings home: profile card plus one row per category. Each category opens
 * its own page, so this screen stays short.
 */
export default function SettingsScreen() {
  const { user, setUser, language, dailyCalorieGoal } = useStore();
  const { t } = useTranslation();
  const colors = useTheme();
  const router = useRouter();
  const { signOut } = useAuth();
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  const groups = [
    { icon: 'flag-outline', title: t('settings.groupGoals' as any), description: `${dailyCalorieGoal.toLocaleString()} kcal · ${t('settings.weightTracker' as any)}`, route: '/(tabs)/settings/goals' },
    { icon: 'options-outline', title: t('settings.groupPreferences' as any), description: `${languageNames[language]} · ${t('settings.appIcon')} · ${t('settings.notifications')}`, route: '/(tabs)/settings/preferences' },
    { icon: 'people-outline', title: t('settings.groupFriends' as any), description: `${t('settings.contacts' as any)} · ${t('block.blockedUsers')}`, route: '/(tabs)/settings/friends' },
    { icon: 'person-circle-outline', title: t('settings.groupAccount' as any), description: `${t('settings.accountSecurity')} · ${t('settings.subscriptionPlan')}`, route: '/(tabs)/settings/account' },
    { icon: 'information-circle-outline', title: t('settings.about'), description: t('settings.aboutDescription'), route: '/(tabs)/settings/about' },
  ] as const;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={{ paddingHorizontal: 18 }}>
          <ScreenHeader title={t('settings.title' as any)} />
          <Appear index={0}>
            <UserProfileCard user={user} onEdit={() => setShowEditProfileModal(true)} />
          </Appear>

          {groups.map((g, i) => (
            <Appear key={g.route} index={i + 1}>
              <SettingItem icon={g.icon} title={g.title} description={g.description} onPress={() => router.push(g.route as any)} />
            </Appear>
          ))}

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
        </View>
      </ScrollView>

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
