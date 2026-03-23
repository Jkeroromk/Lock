import { View, Text, ScrollView, Platform, TouchableOpacity, RefreshControl } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import TabSwitcher from '@/components/dashboard/TabSwitcher';
import MyRankCard from '@/components/dashboard/MyRankCard';
import FriendsLeaderboard from '@/components/dashboard/FriendsLeaderboard';
import ChallengesList from '@/components/dashboard/ChallengesList';
import RefreshLoadingAnimation from '@/components/dashboard/RefreshLoadingAnimation';
import AddFriendModal from '@/components/dashboard/AddFriendModal';
import FriendRequestsCard from '@/components/dashboard/FriendRequestsCard';
import CreateChallengeModal from '@/components/dashboard/CreateChallengeModal';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import {
  fetchLeaderboard, fetchFriendRequests, fetchChallenges, fetchFeed, fetchInviteCode,
  LeaderboardEntry, FriendRequest, ChallengeData, FeedItem,
} from '@/services/api';

type Tab = 'friends' | 'challenges' | 'feed';

export default function DashboardScreen() {
  const { todayCalories, user } = useStore();
  const { t } = useTranslation();
  const colors = useTheme();

  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [challenges, setChallenges] = useState<ChallengeData[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const myEntry = leaderboard.find((e) => e.isMe);
  const myRank = myEntry?.rank ?? 0;

  const loadAll = useCallback(async () => {
    const [lb, reqs, ch, fd, ic] = await Promise.allSettled([
      fetchLeaderboard(),
      fetchFriendRequests(),
      fetchChallenges(),
      fetchFeed(),
      fetchInviteCode(),
    ]);
    if (lb.status === 'fulfilled') setLeaderboard(lb.value);
    if (reqs.status === 'fulfilled') setRequests(reqs.value);
    if (ch.status === 'fulfilled') setChallenges(ch.value);
    if (fd.status === 'fulfilled') setFeed(fd.value);
    if (ic.status === 'fulfilled') setInviteCode(ic.value);
    else console.warn('fetchInviteCode failed:', ic.reason);
  }, []);

  useEffect(() => { loadAll(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const friends = leaderboard.filter((e) => !e.isMe);
  const friendsForLeaderboard = friends.map((f) => ({
    id: f.id,
    name: f.name,
    avatar: f.avatar,
    calories: f.calories,
    rank: f.rank,
    streak: f.streak,
  }));

  const challengesForList = challenges.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description || '',
    progress: c.progress,
    total: c.goalValue,
    participants: c.participants,
  }));

  return (
    <SafeAreaView className="flex-1" edges={['top', 'left', 'right']} style={{ backgroundColor: colors.backgroundPrimary }}>
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: colors.backgroundPrimary }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1, backgroundColor: colors.backgroundPrimary }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textPrimary}
            colors={Platform.OS === 'android' ? [colors.textPrimary] : undefined}
            progressBackgroundColor={Platform.OS === 'android' ? colors.backgroundPrimary : undefined}
            title={Platform.OS === 'ios' && refreshing ? t('dashboard.refreshing') : undefined}
            titleColor={Platform.OS === 'ios' ? colors.textPrimary : undefined}
          />
        }
      >
        <View style={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingTop: DIMENSIONS.SPACING * 0.8 }}>
          <RefreshLoadingAnimation visible={refreshing} />

          {/* Header */}
          <View style={{ marginBottom: DIMENSIONS.SPACING * 1.5 }}>
            <Text style={{
              fontSize: TYPOGRAPHY.titleL, fontWeight: '900',
              color: colors.textPrimary, letterSpacing: -2,
              marginBottom: DIMENSIONS.SPACING * 0.3,
              lineHeight: TYPOGRAPHY.titleL * 1.1,
            }}>
              {t('dashboard.social')}
            </Text>
            <Text style={{
              fontSize: TYPOGRAPHY.bodyM, fontWeight: '500',
              color: colors.textPrimary, opacity: 0.7,
            }}>
              {t('dashboard.withFriends')}
            </Text>
          </View>

          {/* Tab Switcher — now 3 tabs */}
          <View style={{
            flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.5,
            marginBottom: DIMENSIONS.SPACING * 1.2,
          }}>
            {(['friends', 'challenges', 'feed'] as Tab[]).map((tab) => {
              const labels: Record<Tab, string> = { friends: '好友', challenges: '挑战', feed: '动态' };
              const icons: Record<Tab, string> = { friends: 'people', challenges: 'flag', feed: 'newspaper' };
              const active = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    paddingVertical: DIMENSIONS.SPACING * 0.7,
                    borderRadius: 14, borderWidth: 2,
                    backgroundColor: active ? colors.textPrimary : colors.cardBackground,
                    borderColor: active ? colors.textPrimary : colors.borderPrimary,
                    gap: 4,
                  }}
                >
                  <Ionicons
                    name={icons[tab] as any}
                    size={TYPOGRAPHY.iconXS}
                    color={active ? colors.backgroundPrimary : colors.textPrimary}
                  />
                  <Text style={{
                    fontSize: TYPOGRAPHY.bodyS, fontWeight: '900',
                    color: active ? colors.backgroundPrimary : colors.textPrimary,
                  }}>
                    {labels[tab]}
                  </Text>
                  {tab === 'friends' && requests.length > 0 && (
                    <View style={{
                      width: 8, height: 8, borderRadius: 4,
                      backgroundColor: '#EF4444',
                    }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {activeTab === 'friends' && (
            <>
              {requests.length > 0 && (
                <FriendRequestsCard requests={requests} onUpdate={loadAll} />
              )}

              <MyRankCard user={user} todayCalories={todayCalories} rank={myRank} />

              {friends.length > 0 ? (
                <FriendsLeaderboard friends={friendsForLeaderboard} />
              ) : (
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
                    还没有好友
                  </Text>
                  <Text style={{
                    fontSize: TYPOGRAPHY.bodyS, fontWeight: '500',
                    color: colors.textSecondary, textAlign: 'center',
                    lineHeight: TYPOGRAPHY.bodyS * 1.5,
                  }}>
                    分享你的邀请码邀请朋友，或通过用户名添加好友一起打卡
                  </Text>
                </View>
              )}

              {/* Invite code card */}
              <View style={{
                borderRadius: 24, padding: DIMENSIONS.SPACING * 1.2,
                backgroundColor: colors.cardBackground,
                borderWidth: 2, borderColor: colors.borderPrimary,
                marginBottom: DIMENSIONS.SPACING * 1.2,
              }}>
                <Text style={{
                  fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700',
                  color: colors.textSecondary, textTransform: 'uppercase',
                  letterSpacing: 1, marginBottom: DIMENSIONS.SPACING * 0.8,
                }}>
                  我的邀请码
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <TouchableOpacity
                    onPress={handleCopyCode}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      backgroundColor: colors.cardBackgroundSecondary,
                      borderRadius: 12, paddingHorizontal: DIMENSIONS.SPACING * 1,
                      paddingVertical: DIMENSIONS.SPACING * 0.6,
                      gap: 8, borderWidth: 1, borderColor: colors.borderPrimary,
                    }}
                  >
                    <Text style={{
                      fontSize: TYPOGRAPHY.bodyL, fontWeight: '900',
                      color: colors.textPrimary, letterSpacing: 4,
                    }}>
                      {inviteCode || '------'}
                    </Text>
                    <Ionicons
                      name={copied ? 'checkmark' : 'copy-outline'}
                      size={TYPOGRAPHY.iconXS}
                      color={copied ? '#10B981' : colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowAddFriend(true)}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      backgroundColor: colors.textPrimary,
                      borderRadius: 12, paddingHorizontal: DIMENSIONS.SPACING * 0.9,
                      paddingVertical: DIMENSIONS.SPACING * 0.5,
                      gap: 4,
                    }}
                  >
                    <Ionicons name="person-add-outline" size={TYPOGRAPHY.iconXS} color={colors.backgroundPrimary} />
                    <Text style={{
                      fontSize: TYPOGRAPHY.bodyS, fontWeight: '900',
                      color: colors.backgroundPrimary,
                    }}>
                      添加好友
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {activeTab === 'challenges' && (
            <ChallengesList
              challenges={challengesForList}
              onCreateChallenge={() => setShowCreateChallenge(true)}
            />
          )}

          {activeTab === 'feed' && (
            <ActivityFeed items={feed} />
          )}
        </View>
      </ScrollView>

      <AddFriendModal
        visible={showAddFriend}
        onClose={() => setShowAddFriend(false)}
        onSuccess={loadAll}
      />

      <CreateChallengeModal
        visible={showCreateChallenge}
        onClose={() => setShowCreateChallenge(false)}
        onSuccess={() => { loadAll(); }}
      />
    </SafeAreaView>
  );
}
