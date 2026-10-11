import { useRouter } from 'expo-router';
import { useTranslation } from '@/i18n';
import SettingItem from '@/components/settings/SettingItem';
import SettingsPage from '@/components/settings/SettingsPage';

/** Contacts and blocked users. */
export default function FriendsPrivacyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <SettingsPage title={t('settings.groupFriends' as any)}>
      <SettingItem
        icon="people-outline"
        title={t('settings.contacts' as any)}
        description={t('settings.contactsDescription' as any)}
        onPress={() => router.push('/(tabs)/settings/contacts')}
      />
      <SettingItem
        icon="ban-outline"
        title={t('block.blockedUsers')}
        description={t('block.blockedUsersDescription')}
        onPress={() => router.push('/(tabs)/settings/blocked-users')}
      />
    </SettingsPage>
  );
}
