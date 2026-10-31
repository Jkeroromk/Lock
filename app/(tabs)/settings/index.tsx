import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { Appear, ScreenHeader } from '@/components/ui/bxc';
import UserProfileCard from '@/components/settings/UserProfileCard';
import SettingItem from '@/components/settings/SettingItem';
import EditProfileModal from '@/components/settings/EditProfileModal';
import { useRefreshRewards } from '@/hooks/useRefreshRewards';
import { useTabBarInset } from '@/hooks/useTabBarInset';
import { useDeviceLayout } from '@/hooks/useDeviceLayout';
import TwoPane from '@/components/layout/TwoPane';
import { SettingsFooter, useSettingsGroups } from '@/components/settings/SettingsMenu';
import { settingsSplit } from '@/components/settings/settingsSplit';

/**
 * Settings home: profile card plus one row per category. Each category opens
 * its own page, so this screen stays short.
 */
export default function SettingsScreen() {
  const tabInset = useTabBarInset();
  const { twoPane, kind } = useDeviceLayout();
  const { user, setUser } = useStore();
  const { t } = useTranslation();
  const colors = useTheme();
  const router = useRouter();
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  useRefreshRewards();

  const groups = useSettingsGroups();

  const header = <ScreenHeader title={t('settings.title' as any)} />;
  const profile = (
    <Appear index={0}>
      <UserProfileCard user={user} onEdit={() => setShowEditProfileModal(true)} />
    </Appear>
  );
  const rows = groups.map((g, i) => (
    <Appear key={g.route} index={i + 1}>
      <SettingItem icon={g.icon} title={g.title} description={g.description} onPress={() => router.push(g.route as any)} />
    </Appear>
  ));
  const footer = <SettingsFooter />;
  const modal = (
    <>
    <EditProfileModal
      visible={showEditProfileModal}
      user={user}
      onSave={(updated) => {
        setUser({ ...user, ...updated } as any);
        setShowEditProfileModal(false);
      }}
      onCancel={() => setShowEditProfileModal(false)}
    />
    </>
  );

  // Open iPhone Duo side by side (or a wide window): the Settings list is on
  // the left page (app/(tabs)/settings/_layout.tsx); this home page is the
  // right page's default, showing the profile.
  if (settingsSplit(kind)) {
    return (
      <SafeAreaView edges={['top', 'right']} style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: tabInset }}>
          {profile}
        </ScrollView>
        {modal}
      </SafeAreaView>
    );
  }

  // Tabletop: the profile on the top half, the settings list below.
  if (twoPane) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
        <TwoPane
          left={
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: tabInset }}>
              {header}
              {profile}
            </ScrollView>
          }
          right={
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: tabInset }}>
              {rows}
              {footer}
            </ScrollView>
          }
        />
        {modal}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabInset }}>
        <View style={{ paddingHorizontal: 18 }}>
          {header}
          {profile}
          {rows}
          {footer}
        </View>
      </ScrollView>
      {modal}
    </SafeAreaView>
  );
}
