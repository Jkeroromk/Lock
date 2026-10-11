import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import SettingItem from '@/components/settings/SettingItem';
import SettingsPage, { SettingsSection } from '@/components/settings/SettingsPage';

/** Sign-in & security, subscription and data export. */
export default function AccountScreen() {
  const { user } = useStore();
  const { t } = useTranslation();
  const router = useRouter();
  const paid = !!user?.plan && user.plan !== 'FREE';

  return (
    <SettingsPage title={t('settings.groupAccount' as any)}>
      <SettingItem
        icon="shield-checkmark-outline"
        title={t('settings.accountSecurity')}
        description={t('settings.accountSecurityDescription')}
        onPress={() => router.push('/(tabs)/settings/account-security')}
      />

      <SettingsSection label={t('settings.subscriptionPlan')} />
      <SettingItem
        icon="star-outline"
        title={t('settings.subscriptionPlan')}
        description={t('settings.subscriptionPlanDescription')}
        value={user?.plan ?? 'FREE'}
        onPress={() => router.push('/(tabs)/settings/pricing')}
      />
      {paid && (
        <SettingItem
          icon="storefront-outline"
          title={t('settings.manageSubscription' as any)}
          description={t('settings.manageSubscriptionDescription' as any)}
          onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
        />
      )}

      <SettingsSection label={t('settings.groupData' as any)} />
      <SettingItem
        icon="download-outline"
        title={t('settings.exportData')}
        description={t('settings.exportDataDescription')}
        onPress={() => router.push('/(tabs)/settings/export-data')}
      />
    </SettingsPage>
  );
}
