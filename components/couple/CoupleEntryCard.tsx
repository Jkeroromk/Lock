import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import UserAvatar from '@/components/ui/UserAvatar';
import { PressScale } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { useCoupleStore } from '@/store/useCoupleStore';
import { daysSince } from '@/services/couple';

/** Way into the couple space from Social: invite, a pending invite, or the two of you. */
export default function CoupleEntryCard() {
  const c = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { couple, loaded, refresh } = useCoupleStore();
  useEffect(() => { if (!loaded) refresh(); }, [loaded]);

  const accepted = couple?.status === 'ACCEPTED';
  const title = accepted
    ? `${couple!.me.name} ❤ ${couple!.partner.name}`
    : couple ? t('couple.entryTitle') : t('couple.entryInvite');
  const sub = accepted
    ? t('couple.entryDays', { n: String(daysSince(couple!.since)) })
    : couple ? (couple.iInvited ? t('couple.entryPending', { name: couple.partner.name }) : t('couple.entryIncoming', { name: couple.partner.name }))
      : t('couple.entryInviteSub');
  const incoming = couple && !accepted && !couple.iInvited;

  return (
    <PressScale onPress={() => router.push('/couple' as any)} accessibilityRole="button"
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 14, borderRadius: 20, borderWidth: 2, borderColor: c.ink,
        backgroundColor: incoming ? c.accent : '#FFE0E6',
        shadowColor: c.ink, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 3, height: 3 },
      }}>
      {couple ? (
        <View style={{ flexDirection: 'row' }}>
          <UserAvatar image={couple.me.avatarImage} name={couple.me.name} size={40} radius={20} ring={c.ink} />
          <UserAvatar image={couple.partner.avatarImage} name={couple.partner.name} size={40} radius={20} ring={c.ink} style={{ marginLeft: -12 }} />
        </View>
      ) : (
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] }}>
          <Text style={{ fontSize: 22 }}>💕</Text>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '800', color: '#0A0A0A' }}>{title}</Text>
        <Text numberOfLines={1} style={{ fontFamily: FONTS.mono, fontSize: 11, color: '#55544F', marginTop: 1 }}>{sub}</Text>
      </View>
      <Ionicons name="arrow-forward" size={20} color="#0A0A0A" />
    </PressScale>
  );
}
