import { useEffect, useState } from 'react';
import { View, Modal, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import UserAvatar from '@/components/ui/UserAvatar';
import { Button, PressScale } from '@/components/ui/bxc';
import { showToast } from '@/components/ui/Toast';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { fetchLeaderboard, type LeaderboardEntry } from '@/services/api';
import { inviteCouple } from '@/services/couple';
import { useStore } from '@/store/useStore';
import DateField from '@/components/couple/DateField';

const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Invite a friend to be my couple: pick the friend, the day we got together and
 * whose buddy we'll raise together. The friend has to accept.
 */
export default function InviteSheet({ visible, onClose, onSent }: { visible: boolean; onClose: () => void; onSent: () => void }) {
  const c = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const meId = useStore((s) => s.user?.id);
  const [friends, setFriends] = useState<LeaderboardEntry[] | null>(null);
  const [friend, setFriend] = useState<LeaderboardEntry | null>(null);
  const [since, setSince] = useState(todayYmd());
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setFriend(null); setSince(todayYmd());
    fetchLeaderboard().then((l) => setFriends(l.filter((e) => !e.isMe))).catch(() => setFriends([]));
  }, [visible]);


  const send = async () => {
    if (!friend || !meId || sending) return;
    setSending(true);
    try {
      // each of you keeps your own buddy; the room's dog is 豆豆
      await inviteCouple(friend.id, since, meId);
      showToast({ icon: 'heart', message: t('couple.inviteSent') });
      onSent();
      onClose();
    } catch (e: any) {
      showToast({ icon: 'alert-circle', message: t('couple.inviteFailed', { msg: e?.response?.data?.error ?? e?.message ?? '' }) });
    } finally {
      setSending(false);
    }
  };



  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} accessibilityLabel={t('common.close')} />
      <View style={{
        marginTop: 'auto', maxHeight: '90%', width: '100%', maxWidth: 560, alignSelf: 'center',
        backgroundColor: c.backgroundPrimary, borderTopLeftRadius: 30, borderTopRightRadius: 30,
        paddingTop: 10, paddingHorizontal: 20, paddingBottom: insets.bottom + 18,
      }}>
        <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.borderSecondary, marginBottom: 12 }} />
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 14, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
          {!friend ? (
            <>
              <View>
                <Text style={{ fontSize: 24, fontWeight: '800', color: c.textPrimary }}>{t('couple.pickFriend')}</Text>
                <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary, marginTop: 2 }}>{t('couple.pickFriendSub')}</Text>
              </View>
              {friends === null ? <ActivityIndicator color={c.textPrimary} style={{ marginVertical: 30 }} /> : friends.length === 0 ? (
                <Text style={{ fontSize: 15, color: c.textSecondary, paddingVertical: 24, textAlign: 'center' }}>{t('couple.noFriends')}</Text>
              ) : friends.map((f) => (
                <PressScale key={f.id} onPress={() => setFriend(f)} accessibilityRole="button"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, borderWidth: 2, borderColor: c.borderPrimary, backgroundColor: c.cardBackground }}>
                  <UserAvatar image={f.avatarImage} initial={f.avatar} status={f.status} size={44} radius={14} />
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, fontWeight: '800', color: c.textPrimary }}>{f.name}</Text>
                  <Ionicons name="heart-outline" size={20} color={c.textSecondary} />
                </PressScale>
              ))}
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <PressScale onPress={() => setFriend(null)} accessibilityRole="button" accessibilityLabel={t('common.back' as any)}
                  style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="chevron-back" size={22} color={c.textPrimary} />
                </PressScale>
                <UserAvatar image={friend.avatarImage} initial={friend.avatar} status={friend.status} size={52} radius={26} ring={c.ink} />
                <Text numberOfLines={2} style={{ flex: 1, fontSize: 20, fontWeight: '800', color: c.textPrimary }}>{t('couple.inviteTitle', { name: friend.name })}</Text>
              </View>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary }}>{t('couple.since')}</Text>
              <DateField value={since} onChange={setSince} pastOnly />
              <View style={{ borderRadius: 16, borderWidth: 2, borderColor: c.borderPrimary, backgroundColor: c.cardBackground, padding: 12 }}>
                <Text style={{ fontSize: 13, lineHeight: 19, color: c.textSecondary }}>{t('couple.inviteNote')}</Text>
              </View>
            </>
          )}
        </ScrollView>
        {friend ? <Button label={t('couple.sendInvite')} onPress={send} loading={sending} /> : null}
      </View>
    </Modal>
  );
}
