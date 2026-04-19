import { View, Text, Image, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { removeFriend } from '@/services/api';

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
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

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardCard({ entries, onFriendRemoved }: LeaderboardCardProps) {
  const { t } = useTranslation();
  const colors = useTheme();

  const handleLongPress = (entry: LeaderboardEntry) => {
    if (entry.isMe || !entry.friendshipId) return;
    Alert.alert(
      entry.name,
      t('dashboard.removeFriendConfirm' as any),
      [
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
      ]
    );
  };

  if (entries.length === 0) {
    return (
      <View style={{
        borderRadius: 24, padding: DIMENSIONS.SPACING * 2,
        backgroundColor: colors.cardBackground,
        borderWidth: 2, borderColor: colors.borderPrimary,
        alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 1.2,
      }}>
        <Ionicons name="people-outline" size={TYPOGRAPHY.iconM} color={colors.textSecondary} />
        <Text style={{
          fontSize: TYPOGRAPHY.bodyM, fontWeight: '900',
          color: colors.textPrimary, marginTop: DIMENSIONS.SPACING * 0.8,
          marginBottom: DIMENSIONS.SPACING * 0.4,
        }}>
          {t('dashboard.friendsLeaderboard')}
        </Text>
        <Text style={{
          fontSize: TYPOGRAPHY.bodyS, fontWeight: '500',
          color: colors.textSecondary, textAlign: 'center',
          lineHeight: TYPOGRAPHY.bodyS * 1.5,
        }}>
          {t('dashboard.withFriends')}
        </Text>
      </View>
    );
  }

  return (
    <View style={{
      borderRadius: 24,
      backgroundColor: colors.cardBackground,
      borderWidth: 2, borderColor: colors.borderPrimary,
      marginBottom: DIMENSIONS.SPACING * 1.2,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: DIMENSIONS.SPACING * 1.2,
        paddingTop: DIMENSIONS.SPACING * 1.2,
        paddingBottom: DIMENSIONS.SPACING * 0.8,
      }}>
        <View style={{
          width: 32, height: 32, borderRadius: 10,
          backgroundColor: colors.cardBackgroundSecondary,
          alignItems: 'center', justifyContent: 'center',
          marginRight: DIMENSIONS.SPACING * 0.6,
          borderWidth: 1, borderColor: colors.borderPrimary,
        }}>
          <Ionicons name="trophy" size={TYPOGRAPHY.iconXS} color={colors.textPrimary} />
        </View>
        <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary, flex: 1 }}>
          {t('dashboard.friendsLeaderboard')}
        </Text>
        <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {t('dashboard.today') || 'Today'}
        </Text>
      </View>

      {/* Entries */}
      {entries.map((entry, index) => {
        const isLast = index === entries.length - 1;
        const medal = entry.rank <= 3 ? RANK_MEDALS[entry.rank - 1] : null;

        return (
          <TouchableOpacity
            key={entry.id}
            activeOpacity={entry.isMe ? 1 : 0.7}
            onLongPress={() => handleLongPress(entry)}
            delayLongPress={500}
            style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: DIMENSIONS.SPACING * 1.2,
              paddingVertical: DIMENSIONS.SPACING * 0.9,
              borderTopWidth: 1, borderTopColor: colors.borderPrimary,
              backgroundColor: entry.isMe ? colors.cardBackgroundSecondary : 'transparent',
            }}
          >
            {/* Rank */}
            <View style={{ width: 28, alignItems: 'center', marginRight: DIMENSIONS.SPACING * 0.6 }}>
              {medal ? (
                <Text style={{ fontSize: TYPOGRAPHY.bodyM }}>{medal}</Text>
              ) : (
                <Text style={{
                  fontSize: TYPOGRAPHY.bodyS, fontWeight: '900',
                  color: colors.textSecondary,
                }}>
                  {entry.rank}
                </Text>
              )}
            </View>

            {/* Avatar */}
            <View style={{
              width: 38, height: 38, borderRadius: 12,
              backgroundColor: colors.cardBackground,
              borderWidth: entry.isMe ? 2 : 1,
              borderColor: entry.isMe ? colors.textPrimary : colors.borderPrimary,
              alignItems: 'center', justifyContent: 'center',
              marginRight: DIMENSIONS.SPACING * 0.8,
              overflow: 'hidden',
            }}>
              {entry.avatarImage ? (
                <Image source={{ uri: entry.avatarImage }} style={{ width: 38, height: 38 }} />
              ) : (
                <Text style={{ fontSize: TYPOGRAPHY.bodyM }}>{entry.avatar || '🏃'}</Text>
              )}
            </View>

            {/* Name + streak */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{
                  fontSize: TYPOGRAPHY.bodyS, fontWeight: '800',
                  color: colors.textPrimary,
                }} numberOfLines={1}>
                  {entry.name}
                </Text>
                {entry.isMe && (
                  <View style={{
                    paddingHorizontal: 6, paddingVertical: 1,
                    backgroundColor: colors.textPrimary, borderRadius: 6,
                  }}>
                    <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '900', color: colors.backgroundPrimary }}>
                      {t('dashboard.me') || 'Me'}
                    </Text>
                  </View>
                )}
              </View>
              {entry.streak > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                  <Ionicons name="flame" size={10} color="#F97316" />
                  <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textSecondary }}>
                    {entry.streak}d streak
                  </Text>
                </View>
              )}
            </View>

            {/* Calories */}
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{
                fontSize: TYPOGRAPHY.bodyM, fontWeight: '900',
                color: colors.textPrimary,
              }}>
                {entry.calories.toLocaleString()}
              </Text>
              <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textSecondary }}>
                {t('today.kcal')}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
