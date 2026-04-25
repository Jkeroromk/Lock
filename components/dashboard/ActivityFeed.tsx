import { View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { FeedItem } from '@/services/api';
import { useTranslation } from '@/i18n';

interface ActivityFeedProps {
  items: FeedItem[];
}

const FEED_ICONS: Record<string, { icon: string; color: string }> = {
  MEAL_LOGGED: { icon: 'restaurant', color: '#10B981' },
  GOAL_REACHED: { icon: 'trophy', color: '#F59E0B' },
  STREAK_MILESTONE: { icon: 'flame', color: '#F97316' },
  CHALLENGE_JOINED: { icon: 'flag', color: '#6366F1' },
  CHALLENGE_COMPLETED: { icon: 'medal', color: '#EC4899' },
  FRIEND_ADDED: { icon: 'people', color: '#3B82F6' },
};

export default function ActivityFeed({ items }: ActivityFeedProps) {
  const colors = useTheme();
  const { t } = useTranslation();

  function getFeedLabel(type: string, metadata: any, isMe: boolean, name: string): string {
    const r = (key: string, vars: Record<string, string> = {}) => {
      let s = t(key as any) as string;
      for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
      return s;
    };
    switch (type) {
      case 'MEAL_LOGGED':
        return isMe ? r('feed.mealLogged') : r('feed.mealLoggedOther', { name });
      case 'GOAL_REACHED':
        return isMe ? r('feed.goalReached') : r('feed.goalReachedOther', { name });
      case 'STREAK_MILESTONE':
        return isMe
          ? r('feed.streakMilestone', { days: String(metadata?.days ?? '') })
          : r('feed.streakMilestoneOther', { name, days: String(metadata?.days ?? '') });
      case 'CHALLENGE_JOINED':
        return isMe
          ? r('feed.challengeJoined', { title: metadata?.title ?? '' })
          : r('feed.challengeJoinedOther', { name, title: metadata?.title ?? '' });
      case 'CHALLENGE_COMPLETED':
        return isMe
          ? r('feed.challengeCompleted', { title: metadata?.title ?? '' })
          : r('feed.challengeCompletedOther', { name, title: metadata?.title ?? '' });
      case 'FRIEND_ADDED':
        return r('feed.friendAdded', { name: String(metadata?.friendName ?? name) });
      default:
        return type;
    }
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('feed.justNow' as any);
    if (mins < 60) return (t('feed.minutesAgo' as any) as string).replace('{mins}', String(mins));
    const hours = Math.floor(mins / 60);
    if (hours < 24) return (t('feed.hoursAgo' as any) as string).replace('{hours}', String(hours));
    return (t('feed.daysAgo' as any) as string).replace('{days}', String(Math.floor(hours / 24)));
  }

  if (items.length === 0) {
    return (
      <View style={{
        borderRadius: 24, padding: DIMENSIONS.SPACING * 2,
        backgroundColor: colors.cardBackground,
        borderWidth: 2, borderColor: colors.borderPrimary,
        alignItems: 'center',
      }}>
        <Ionicons name="newspaper-outline" size={TYPOGRAPHY.iconM} color={colors.textSecondary} />
        <Text style={{
          fontSize: TYPOGRAPHY.bodyM, fontWeight: '700',
          color: colors.textSecondary, marginTop: DIMENSIONS.SPACING * 0.8,
          textAlign: 'center',
        }}>
          {t('feed.empty' as any)}
        </Text>
      </View>
    );
  }

  return (
    <View style={{
      borderRadius: 24,
      backgroundColor: colors.cardBackground,
      borderWidth: 2, borderColor: colors.borderPrimary,
      overflow: 'hidden',
    }}>
      <View style={{ padding: DIMENSIONS.SPACING * 1.2, paddingBottom: DIMENSIONS.SPACING * 0.8, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{
          width: 32, height: 32, borderRadius: 10,
          backgroundColor: colors.cardBackgroundSecondary,
          alignItems: 'center', justifyContent: 'center',
          marginRight: DIMENSIONS.SPACING * 0.6,
        }}>
          <Ionicons name="newspaper" size={TYPOGRAPHY.iconXS} color={colors.textPrimary} />
        </View>
        <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>
          {t('feed.title' as any)}
        </Text>
      </View>

      {items.map((item, i) => {
        const config = FEED_ICONS[item.type] ?? { icon: 'ellipse', color: colors.textSecondary };
        const text = getFeedLabel(item.type, item.metadata, item.isMe, item.user.name);
        return (
          <View key={item.id} style={{
            flexDirection: 'row', alignItems: 'flex-start',
            paddingHorizontal: DIMENSIONS.SPACING * 1.2,
            paddingVertical: DIMENSIONS.SPACING * 0.9,
            borderTopWidth: 1, borderTopColor: colors.borderPrimary,
          }}>
            <View style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: colors.cardBackgroundSecondary,
              alignItems: 'center', justifyContent: 'center',
              marginRight: DIMENSIONS.SPACING * 0.8,
              overflow: 'hidden',
            }}>
              {item.user.avatarImage ? (
                <Image source={{ uri: item.user.avatarImage }} style={{ width: 36, height: 36 }} />
              ) : (
                <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '900', color: colors.textPrimary }}>
                  {item.user.avatar}
                </Text>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '600', color: colors.textPrimary, lineHeight: TYPOGRAPHY.bodyS * 1.5 }}>
                {text}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <View style={{
                  width: 16, height: 16, borderRadius: 5,
                  backgroundColor: config.color + '22',
                  alignItems: 'center', justifyContent: 'center',
                  marginRight: 4,
                }}>
                  <Ionicons name={config.icon as any} size={10} color={config.color} />
                </View>
                <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary, fontWeight: '500' }}>
                  {timeAgo(item.createdAt)}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
