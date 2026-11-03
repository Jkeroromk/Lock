import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import UserAvatar from '@/components/ui/UserAvatar';
import { PressScale } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { useFriendRequestsStore } from '@/store/useFriendRequestsStore';
import { showToast } from '@/components/ui/Toast';

/**
 * "Alex wants to be friends — Accept / View" at the top of Today. Requests
 * used to sit only at the top of the Social leaderboard, so people saw the
 * notification but couldn't find where to accept it.
 */
export default function FriendRequestBanner() {
  const c = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const requests = useFriendRequestsStore((s) => s.requests);
  const respond = useFriendRequestsStore((s) => s.respond);
  const first = requests[0];
  if (!first) return null;

  const accept = async () => {
    const ok = await respond(first.id, 'accept');
    showToast(ok
      ? { icon: 'people', message: t('friendReq.accepted', { name: first.from.name }) }
      : { icon: 'alert-circle', message: t('friendReq.failed') });
  };

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 14,
      borderRadius: 20, borderWidth: 2, borderColor: c.ink, backgroundColor: c.accent,
    }}>
      <UserAvatar image={first.from.avatarImage} initial={first.from.avatar} status={first.from.status} size={44} radius={14} ring={c.ink} />
      <Text numberOfLines={2} style={{ flex: 1, fontSize: 15, fontWeight: '800', color: c.onAccent }}>
        {requests.length > 1
          ? t('friendReq.bannerMore', { name: first.from.name, n: String(requests.length - 1) })
          : t('friendReq.banner', { name: first.from.name })}
      </Text>
      <PressScale onPress={accept} accessibilityRole="button"
        style={{ height: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: c.accent }}>{t('friendReq.accept')}</Text>
      </PressScale>
      <PressScale onPress={() => router.navigate({ pathname: '/(tabs)/dashboard', params: { requests: '1' } } as any)} accessibilityRole="button"
        style={{ height: 44, paddingHorizontal: 12, borderRadius: 14, borderWidth: 2, borderColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: c.onAccent }}>{t('friendReq.view')}</Text>
      </PressScale>
    </View>
  );
}
