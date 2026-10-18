import { View, ScrollView, Platform, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from '@/i18n';
import { Appear, IconButton, ScreenHeader, Segmented } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import LeaderboardCard from '@/components/dashboard/LeaderboardCard';
import ChallengesList from '@/components/dashboard/ChallengesList';
import AddFriendModal from '@/components/dashboard/AddFriendModal';
import FriendRequestsCard from '@/components/dashboard/FriendRequestsCard';
import PendingSentRequestsCard from '@/components/dashboard/PendingSentRequestsCard';
import CreateChallengeModal from '@/components/dashboard/CreateChallengeModal';
import PetHome from '@/components/pet/PetHome';
import { usePetStore } from '@/store/usePetStore';
import {
  fetchLeaderboard, fetchFriendRequests, fetchSentRequests, fetchChallenges,
  LeaderboardEntry, FriendRequest, SentRequest, ChallengeData,
} from '@/services/api';
import TabFocusFade from '@/components/ui/TabFocusFade';
import { useTabBarInset } from '@/hooks/useTabBarInset';

type Tab = 'friends' | 'challenges' | 'pet';

export default function DashboardScreen() {
  const tabInset = useTabBarInset();
  const { t } = useTranslation();
  const colors = useTheme();
  const { addFriend: deepLinkCode } = useLocalSearchParams<{ addFriend?: string }>();

  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [pendingFriendId, setPendingFriendId] = useState<string | undefined>();

  useEffect(() => {
    if (deepLinkCode) {
      setPendingFriendId(deepLinkCode);
      setShowAddFriend(true);
    }
  }, [deepLinkCode]);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [challenges, setChallenges] = useState<ChallengeData[]>([]);
  const syncPet = usePetStore((s) => s.sync);
  const hasPet = usePetStore((s) => !!s.state?.profile);

  const loadAll = useCallback(async () => {
    const [lb, reqs, sent, ch] = await Promise.allSettled([
      fetchLeaderboard(),
      fetchFriendRequests(),
      fetchSentRequests(),
      fetchChallenges(),
      syncPet(),
    ]);
    if (lb.status === 'fulfilled') setLeaderboard(lb.value);
    if (reqs.status === 'fulfilled') setRequests(reqs.value);
    if (sent.status === 'fulfilled') setSentRequests(sent.value);
    if (ch.status === 'fulfilled') setChallenges(ch.value);
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
    status: e.status ?? null,
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
    { key: 'pet', label: t('pet.tab') },
  ];

  const FAB_CONFIG: Record<Tab, { label: string; icon: string; onPress: () => void }> = {
    friends: { label: t('dashboard.addFriend'), icon: 'person-add-outline', onPress: () => setShowAddFriend(true) },
    challenges: { label: t('dashboard.createChallenge'), icon: 'add', onPress: () => setShowCreateChallenge(true) },
    pet: hasPet
      ? { label: t('pet.collection'), icon: 'grid-outline', onPress: () => router.push('/pet/collection') }
      : { label: t('pet.setupTitle'), icon: 'paw-outline', onPress: () => router.push('/pet/setup') },
  };

  return (
    <TabFocusFade>
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundPrimary }} edges={['top', 'left', 'right']}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabInset }}
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
            onChange={(k) => { setActiveTab(k); if (k === 'pet') syncPet(); }}
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

          {/* ── 伙伴 Tab ── */}
          {!initialLoading && activeTab === 'pet' && (
            <Appear key="pet">
              <PetHome friends={leaderboard} onFriendsChanged={setLeaderboard} />
            </Appear>
          )}
        </View>
      </ScrollView>

      <AddFriendModal
        visible={showAddFriend}
        onClose={() => { setShowAddFriend(false); setPendingFriendId(undefined); }}
        onSuccess={loadAll}
        initialValue={pendingFriendId}
      />

      <CreateChallengeModal
        visible={showCreateChallenge}
        onClose={() => setShowCreateChallenge(false)}
        onSuccess={() => { loadAll(); }}
      />
    </SafeAreaView>
    </TabFocusFade>
  );
}
