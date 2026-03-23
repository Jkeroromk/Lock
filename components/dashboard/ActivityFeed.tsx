import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { FeedItem } from '@/services/api';

interface ActivityFeedProps {
  items: FeedItem[];
}

const FEED_CONFIG: Record<string, { icon: string; color: string; label: (m: any, isMe: boolean, name: string) => string }> = {
  MEAL_LOGGED: { icon: 'restaurant', color: '#10B981', label: (m, isMe, name) => isMe ? `你记录了一顿餐食` : `${name} 记录了一顿餐食` },
  GOAL_REACHED: { icon: 'trophy', color: '#F59E0B', label: (m, isMe, name) => isMe ? '你达到了今日卡路里目标！' : `${name} 达到了今日卡路里目标！` },
  STREAK_MILESTONE: { icon: 'flame', color: '#F97316', label: (m, isMe, name) => isMe ? `你已连续打卡 ${m?.days} 天` : `${name} 已连续打卡 ${m?.days} 天` },
  CHALLENGE_JOINED: { icon: 'flag', color: '#6366F1', label: (m, isMe, name) => isMe ? `你加入了挑战「${m?.title}」` : `${name} 加入了挑战「${m?.title}」` },
  CHALLENGE_COMPLETED: { icon: 'medal', color: '#EC4899', label: (m, isMe, name) => isMe ? `你完成了挑战「${m?.title}」！` : `${name} 完成了挑战「${m?.title}」！` },
  FRIEND_ADDED: { icon: 'people', color: '#3B82F6', label: (m, isMe, name) => isMe ? '你添加了一位新好友' : `${name} 成为了你的好友` },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

export default function ActivityFeed({ items }: ActivityFeedProps) {
  const colors = useTheme();

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
          暂无动态，添加好友后这里会显示大家的打卡记录
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
          好友动态
        </Text>
      </View>

      {items.map((item, i) => {
        const config = FEED_CONFIG[item.type] ?? {
          icon: 'ellipse', color: colors.textSecondary,
          label: () => item.type,
        };
        const text = config.label(item.metadata, item.isMe, item.user.name);
        return (
          <View key={item.id} style={{
            flexDirection: 'row', alignItems: 'flex-start',
            paddingHorizontal: DIMENSIONS.SPACING * 1.2,
            paddingVertical: DIMENSIONS.SPACING * 0.9,
            borderTopWidth: 1, borderTopColor: colors.borderPrimary,
          }}>
            {/* Avatar */}
            <View style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: colors.cardBackgroundSecondary,
              alignItems: 'center', justifyContent: 'center',
              marginRight: DIMENSIONS.SPACING * 0.8,
            }}>
              <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '900', color: colors.textPrimary }}>
                {item.user.avatar}
              </Text>
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
