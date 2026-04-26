import { View, Text, ScrollView, Platform, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
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

type Tab = 'friends' | 'challenges' | 'moments';

export default function DashboardScreen() {
  const { todayCalories, user } = useStore();
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

  const TAB_CONFIG: { key: Tab; label: string; icon: string }[] = [
    { key: 'friends', label: t('dashboard.leaderboard'), icon: 'people' },
    { key: 'challenges', label: t('dashboard.challenges'), icon: 'flag' },
    { key: 'moments', label: t('moments.title' as any), icon: 'images' },
  ];

  const FAB_CONFIG: Record<Tab, { label: string; icon: string; onPress: () => void }> = {
    friends: { label: t('dashboard.addFriend'), icon: 'person-add-outline', onPress: () => setShowAddFriend(true) },
    challenges: { label: t('dashboard.createChallenge'), icon: 'add', onPress: () => setShowCreateChallenge(true) },
    moments: { label: t('moments.create' as any), icon: 'add', onPress: () => setShowCreateMoment(true) },
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundPrimary }} edges={['top', 'left', 'right']}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
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
        <View style={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingTop: DIMENSIONS.SPACING * 0.8 }}>
          {/* ── Tab Switcher ── */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: colors.cardBackground,
            borderRadius: 16, borderWidth: 2, borderColor: colors.borderPrimary,
            padding: 4,
            marginBottom: DIMENSIONS.SPACING * 1.4,
          }}>
            {TAB_CONFIG.map(({ key, label, icon }) => {
              const active = activeTab === key;
              const hasBadge = key === 'friends' && requests.length > 0;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setActiveTab(key)}
                  style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    paddingVertical: DIMENSIONS.SPACING * 0.65,
                    borderRadius: 12,
                    backgroundColor: active ? colors.textPrimary : 'transparent',
                    gap: 5,
                  }}
                >
                  <Ionicons
                    name={icon as any}
                    size={TYPOGRAPHY.iconXS * 0.85}
                    color={active ? colors.backgroundPrimary : colors.textSecondary}
                  />
                  <Text style={{
                    fontSize: TYPOGRAPHY.bodyXS, fontWeight: '800',
                    color: active ? colors.backgroundPrimary : colors.textSecondary,
                  }}>
                    {label}
                  </Text>
                  {hasBadge && (
                    <View style={{
                      width: 7, height: 7, borderRadius: 4,
                      backgroundColor: '#EF4444',
                      position: 'absolute', top: 6, right: 8,
                    }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Initial Loading ── */}
          {initialLoading && (
            <View style={{ paddingVertical: DIMENSIONS.SPACING * 4, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.textPrimary} />
            </View>
          )}

          {/* ── Friends Tab ── */}
          {!initialLoading && activeTab === 'friends' && (
            <>
              {requests.length > 0 && (
                <>
                  <FriendRequestsCard requests={requests} onUpdate={loadAll} />
                  <PendingSentRequestsCard requests={sentRequests} onUpdate={loadAll} />
                </>
              )}
              <LeaderboardCard entries={leaderboardEntries} onFriendRemoved={loadAll} />
            </>
          )}

          {/* ── Challenges Tab ── */}
          {!initialLoading && activeTab === 'challenges' && (
            <ChallengesList challenges={challengesForList} />
          )}

          {/* ── Moments Tab ── */}
          {!initialLoading && activeTab === 'moments' && (
            <MomentsFeed
              items={moments}
              onRefresh={loadAll}
              onCreatePress={() => setShowCreateMoment(true)}
            />
          )}
        </View>
      </ScrollView>

      {/* ── Floating Action Button ── */}
      <View style={{
        position: 'absolute', bottom: 24, left: DIMENSIONS.CARD_PADDING, right: DIMENSIONS.CARD_PADDING,
        pointerEvents: 'box-none',
      }}>
        <TouchableOpacity
          onPress={FAB_CONFIG[activeTab].onPress}
          activeOpacity={0.85}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            backgroundColor: colors.textPrimary,
            borderRadius: 18, paddingVertical: DIMENSIONS.SPACING * 0.85,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Ionicons name={FAB_CONFIG[activeTab].icon as any} size={TYPOGRAPHY.iconXS} color={colors.backgroundPrimary} />
          <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '900', color: colors.backgroundPrimary }}>
            {FAB_CONFIG[activeTab].label}
          </Text>
        </TouchableOpacity>
      </View>

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
  );
}
