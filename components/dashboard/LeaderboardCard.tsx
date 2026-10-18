import { View, Image, TouchableOpacity, Alert } from 'react-native';
import UserAvatar from '@/components/ui/UserAvatar';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { FONTS } from '@/constants/fonts';
import { removeFriend } from '@/services/api';
import { useBlockUser } from '@/hooks/useBlockUser';
import { HardShadow, Label, RADIUS, STROKE, Sticker } from '@/components/ui/bxc';

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  status?: string | null;
  avatarImage?: string;
  calories: number;
  rank: number;
  streak: number;
  isMe: boolean;
  friendshipId?: string;
}

interface LeaderboardCardProps {
  entries: LeaderboardEntry[];
  onFriendRemoved?: () => void;
}

function Avatar({ entry, size, highlight }: { entry: LeaderboardEntry; size: number; highlight?: boolean }) {
  const c = useTheme();
  return (
    <UserAvatar
      image={entry.avatarImage}
      initial={entry.avatar}
      name={entry.name}
      status={entry.status}
      size={size}
      background={highlight ? c.paper : c.textPrimary}
      color={highlight ? c.ink : c.backgroundPrimary}
      ring={highlight ? c.ink : undefined}
    />
  );
}

/** "My rank" hero plus one stroked row per friend; long-press a friend to remove or block. */
export default function LeaderboardCard({ entries, onFriendRemoved }: LeaderboardCardProps) {
  const { t } = useTranslation();
  const c = useTheme();
  const confirmBlock = useBlockUser();

  const handleLongPress = (entry: LeaderboardEntry) => {
    if (entry.isMe || !entry.friendshipId) return;
    Alert.alert(entry.name, t('dashboard.removeFriendConfirm' as any), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('dashboard.removeFriend' as any),
        style: 'destructive',
        onPress: async () => {
          try {
            await removeFriend(entry.friendshipId!);
            onFriendRemoved?.();
          } catch {
            Alert.alert(t('common.error'), t('dashboard.removeFriendFailed' as any));
          }
        },
      },
      { text: t('block.blockUser'), style: 'destructive', onPress: () => confirmBlock(entry, () => onFriendRemoved?.()) },
    ]);
  };

  if (entries.length === 0) {
    return (
      <View style={{ borderRadius: RADIUS.card, borderWidth: STROKE.card, borderColor: c.borderPrimary, backgroundColor: c.cardBackground, padding: 24, alignItems: 'center', marginBottom: 14 }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: c.accent, borderWidth: 2, borderColor: c.ink, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] }}>
          <Ionicons name="people-outline" size={30} color={c.onAccent} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: '800', color: c.textPrimary, marginTop: 16 }}>{t('dashboard.friendsLeaderboard')}</Text>
        <Text style={{ fontSize: 14, lineHeight: 20, color: c.textSecondary, textAlign: 'center', marginTop: 6 }}>{t('dashboard.withFriends')}</Text>
      </View>
    );
  }

  const me = entries.find((e) => e.isMe);
  const ahead = me && me.rank > 1 ? entries.find((e) => e.rank === me.rank - 1) : undefined;

  return (
    <View style={{ marginBottom: 14 }}>
      {me ? (
        <HardShadow color={c.accent} radius={RADIUS.hero} style={{ marginBottom: 14 }}>
          <View style={{ backgroundColor: c.ink, borderRadius: RADIUS.hero, borderWidth: 2, borderColor: c.ink, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Label color="#9A9A95">{t('dashboard.myRank')}</Label>
              <Text style={{ fontSize: 60, fontWeight: '800', letterSpacing: -2.5, lineHeight: 62, color: c.paper }}>#{me.rank}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 10 }}>
              {me.streak > 0 ? (
                <Sticker>{t('today.streakDays', { n: String(me.streak) })}</Sticker>
              ) : null}
              <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: '#9A9A95', textAlign: 'right' }}>
                {me.calories.toLocaleString()} {t('today.kcal')}{ahead ? ` · #${ahead.rank} ${ahead.name}` : ''}
              </Text>
            </View>
          </View>
        </HardShadow>
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: c.textPrimary }}>{t('dashboard.friendsLeaderboard')}</Text>
        <Label style={{ fontSize: 10 }}>{t('dashboard.today') || 'Today'}</Label>
      </View>

      <View style={{ gap: 8 }}>
        {entries.map((entry) => {
          const mine = entry.isMe;
          const fg = mine ? c.onAccent : c.textPrimary;
          const muted = mine ? c.onAccent : c.textSecondary;
          return (
            <TouchableOpacity
              key={entry.id}
              activeOpacity={mine ? 1 : 0.75}
              onLongPress={() => handleLongPress(entry)}
              delayLongPress={500}
              accessibilityLabel={`${entry.rank}. ${entry.name}, ${entry.calories} ${t('today.kcal')}, ${entry.streak}`}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64,
                paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18,
                borderWidth: STROKE.card, borderColor: mine ? c.ink : c.borderPrimary,
                backgroundColor: mine ? c.accent : c.cardBackground,
              }}
            >
              <Text style={{ fontFamily: FONTS.mono, fontWeight: '600', fontSize: 13, color: fg, width: 22 }}>{entry.rank}</Text>
              <Avatar entry={entry} size={40} highlight={mine} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: '800', color: fg }}>
                  {mine ? `${entry.name} · ${t('dashboard.me') || 'Me'}` : entry.name}
                </Text>
                <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: muted, marginTop: 1 }}>
                  {entry.calories.toLocaleString()} kcal{entry.streak > 0 ? ` · ${t('today.streakDays', { n: String(entry.streak) })}` : ''}
                </Text>
              </View>
              {entry.rank === 1 ? <Ionicons name="trophy-outline" size={20} color={fg} accessibilityLabel="#1" /> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
