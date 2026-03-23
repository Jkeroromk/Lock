import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

interface Friend {
  id: string;
  name: string;
  avatar: string;
  calories: number;
  rank: number;
  streak: number;
}

interface FriendsLeaderboardProps {
  friends: Friend[];
}

export default function FriendsLeaderboard({ friends }: FriendsLeaderboardProps) {
  const { t } = useTranslation();
  const colors = useTheme();

  return (
    <View
      style={{
        borderRadius: 16,
        padding: DIMENSIONS.SPACING * 0.8,
        marginBottom: DIMENSIONS.SPACING * 0.8,
        backgroundColor: colors.cardBackground,
        borderWidth: 1,
        borderColor: colors.borderPrimary,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 0.8 }}>
        <View
          style={{
            width: DIMENSIONS.SCREEN_WIDTH * 0.07,
            height: DIMENSIONS.SCREEN_WIDTH * 0.07,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: DIMENSIONS.SPACING * 0.5,
            backgroundColor: colors.cardBackgroundSecondary,
          }}
        >
          <Ionicons name="people" size={TYPOGRAPHY.bodyM} color={colors.textPrimary} />
        </View>
        <Text
          style={{
            fontSize: TYPOGRAPHY.bodyM,
            fontWeight: '900',
            color: colors.textPrimary,
            flex: 1,
            flexShrink: 1,
          }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {t('dashboard.friendsLeaderboard')}
        </Text>
      </View>
      {friends.map((friend, index) => (
        <View
          key={friend.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: DIMENSIONS.SPACING * 0.45,
            borderBottomWidth: index < friends.length - 1 ? 1 : 0,
            borderBottomColor: colors.borderPrimary,
          }}
        >
          <View style={{ width: DIMENSIONS.SCREEN_WIDTH * 0.07, alignItems: 'center' }}>
            {friend.rank === 1 && (
              <Ionicons name="trophy" size={TYPOGRAPHY.bodyM} color={colors.textPrimary} />
            )}
            {friend.rank === 2 && (
              <Ionicons name="medal" size={TYPOGRAPHY.bodyM} color={colors.textPrimary} />
            )}
            {friend.rank === 3 && (
              <Ionicons name="medal-outline" size={TYPOGRAPHY.bodyM} color={colors.textPrimary} />
            )}
            {friend.rank > 3 && (
              <Text
                style={{
                  fontSize: TYPOGRAPHY.bodyS,
                  fontWeight: '900',
                  color: colors.textPrimary,
                }}
              >
                {friend.rank}
              </Text>
            )}
          </View>
          <View
            style={{
              width: DIMENSIONS.SCREEN_WIDTH * 0.08,
              height: DIMENSIONS.SCREEN_WIDTH * 0.08,
              borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.04,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: DIMENSIONS.SPACING * 0.6,
              backgroundColor: colors.cardBackgroundSecondary,
            }}
          >
            <Text
              style={{
                fontSize: TYPOGRAPHY.bodyM,
                fontWeight: '900',
                color: colors.textPrimary,
              }}
            >
              {friend.avatar}
            </Text>
          </View>
          <View style={{ flex: 1, flexShrink: 1 }}>
            <Text
              style={{
                fontSize: TYPOGRAPHY.bodyS,
                fontWeight: '700',
                color: colors.textPrimary,
                marginBottom: 1,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {friend.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <Ionicons name="flame" size={TYPOGRAPHY.bodyXS} color="#F97316" style={{ marginRight: DIMENSIONS.SPACING * 0.2 }} />
              <Text
                style={{
                  fontSize: TYPOGRAPHY.bodyXS,
                  fontWeight: '600',
                  color: colors.textPrimary,
                  opacity: 0.7,
                }}
                numberOfLines={1}
              >
                {friend.calories} {t('today.kcal')}
              </Text>
              <Text
                style={{
                  fontSize: TYPOGRAPHY.bodyXS,
                  fontWeight: '600',
                  color: colors.textPrimary,
                  opacity: 0.5,
                  marginLeft: DIMENSIONS.SPACING * 0.4,
                }}
                numberOfLines={1}
              >
                · {friend.streak} {t('dashboard.days')} {t('dashboard.streak')}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

