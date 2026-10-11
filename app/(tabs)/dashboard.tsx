import { View, ScrollView, Platform, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from '@/i18n';
import { Appear, IconButton, ScreenHeader, Segmented } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import LeaderboardCard from '@/components/dashboard/LeaderboardCard';
import ChallengesList from '@/components/dashboard/ChallengesList';
import AddFriendModal from '@/components/dashboard/AddFriendModal';
import FriendRequestsCard from '@/components/dashboard/FriendRequestsCard';
import PendingSentRequestsCard from '@/components/dashboard/PendingSentRequestsCard';
import CreateChallengeModal from '@/components/dashboard/CreateChallengeModal';
import MomentsFeed from '@/components/dashboard/MomentsFeed';
import CreateMomentModal from '@/components/dashboard/CreateMomentModal';
import {
  fetchLeaderboard, fetchFriendRequests, fetchSentRequests, fetchChallenges, fetchMoments,
  LeaderboardEntry, FriendRequest, SentRequest, ChallengeData, Moment,
} from '@/services/api';
import TabFocusFade from '@/components/ui/TabFocusFade';

type Tab = 'friends' | 'challenges' | 'moments';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { inviteCode: deepLinkCode } = useLocalSearchParams<{ inviteCode?: string }>();

  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [showCreateMoment, setShowCreateMoment] = useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | undefined>();

  useEffect(() => {
    if (deepLinkCode) {
      setPendingInviteCode(deepLinkCode);
      setShowAddFriend(true);
    }
  }, [deepLinkCode]);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [challenges, setChallenges] = useState<ChallengeData[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);

  const loadAll = useCallback(async () => {
    const [lb, reqs, sent, ch, mom] = await Promise.allSettled([
      fetchLeaderboard(),
      fetchFriendRequests(),
      fetchSentRequests(),
      fetchChallenges(),
      fetchMoments(),
    ]);
    if (lb.status === 'fulfilled') setLeaderboard(lb.value);
    if (reqs.status === 'fulfilled') setRequests(reqs.value);
    if (sent.status === 'fulfilled') setSentRequests(sent.value);
    if (ch.status === 'fulfilled') setChallenges(ch.value);
    if (mom.status === 'fulfilled') setMoments(mom.value);
  }, []);

  useEffect(() => {
    loadAll().finally(() => setInitialLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  // Build combined leaderboard: me + friends sorted by rank
  const leaderboardEntries = leaderboard.map((e) => ({
    id: e.id,
    name: e.name,
    avatar: e.avatar,
    avatarImage: e.avatarImage ?? undefined,
    calories: e.calories,
    rank: e.rank,
    streak: e.streak,
    isMe: e.isMe,
    friendshipId: e.friendshipId,
  }));

  const challengesForList = challenges.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description || '',
    progress: c.progress,
    total: c.goalValue,
    participants: c.participants,
  }));

  const TAB_CONFIG: { key: Tab; label: string }[] = [
    { key: 'friends', label: t('dashboard.leaderboard') },
    { key: 'challenges', label: t('dashboard.challenges') },
    { key: 'moments', label: t('moments.title' as any) },
  ];

  const FAB_CONFIG: Record<Tab, { label: string; icon: string; onPress: () => void }> = {
    friends: { label: t('dashboard.addFriend'), icon: 'person-add-outline', onPress: () => setShowAddFriend(true) },
    challenges: { label: t('dashboard.createChallenge'), icon: 'add', onPress: () => setShowCreateChallenge(true) },
    moments: { label: t('moments.create' as any), icon: 'add', onPress: () => setShowCreateMoment(true) },
  };

  return (
    <TabFocusFade>
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundPrimary }} edges={['top', 'left', 'right']}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textPrimary}
            colors={Platform.OS === 'android' ? [colors.textPrimary] : undefined}
            progressBackgroundColor={Platform.OS === 'android' ? colors.backgroundPrimary : undefined}
          />
        }
      >
        <View style={{ paddingHorizontal: 18 }}>
          <ScreenHeader
            title={t('tabs.social')}
            right={
              <IconButton
                icon={FAB_CONFIG[activeTab].icon}
                filled
                onPress={FAB_CONFIG[activeTab].onPress}
                accessibilityLabel={FAB_CONFIG[activeTab].label}
              />
            }
          />
          <Segmented
            value={activeTab}
            onChange={setActiveTab}
            options={TAB_CONFIG.map(({ key, label }) => ({ key, label, badge: key === 'friends' && requests.length > 0 }))}
            style={{ marginBottom: 16 }}
          />

          {/* ── Initial Loading ── */}
          {initialLoading && (
            <View style={{ paddingVertical: 64, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.textPrimary} />
            </View>
          )}

          {/* ── Friends Tab ── */}
          {!initialLoading && activeTab === 'friends' && (
            <Appear key="friends">
              {requests.length > 0 && (
                <>
                  <FriendRequestsCard requests={requests} onUpdate={loadAll} />
                  <PendingSentRequestsCard requests={sentRequests} onUpdate={loadAll} />
                </>
              )}
              <LeaderboardCard entries={leaderboardEntries} onFriendRemoved={loadAll} />
            </Appear>
          )}

          {/* ── Challenges Tab ── */}
          {!initialLoading && activeTab === 'challenges' && (
            <Appear key="challenges"><ChallengesList challenges={challengesForList} /></Appear>
          )}

          {/* ── Moments Tab ── */}
          {!initialLoading && activeTab === 'moments' && (
            <Appear key="moments">
            <MomentsFeed
              items={moments}
              onRefresh={loadAll}
              onCreatePress={() => setShowCreateMoment(true)}
            />
            </Appear>
          )}
        </View>
      </ScrollView>

      <AddFriendModal
        visible={showAddFriend}
        onClose={() => { setShowAddFriend(false); setPendingInviteCode(undefined); }}
        onSuccess={loadAll}
        initialValue={pendingInviteCode}
      />

      <CreateChallengeModal
        visible={showCreateChallenge}
        onClose={() => setShowCreateChallenge(false)}
        onSuccess={() => { loadAll(); }}
      />

      <CreateMomentModal
        visible={showCreateMoment}
        onClose={() => setShowCreateMoment(false)}
        onSuccess={(moment) => setMoments((prev) => [moment, ...prev])}
      />
    </SafeAreaView>
    </TabFocusFade>
  );
}
