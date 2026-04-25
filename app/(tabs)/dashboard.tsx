import { View, Text, ScrollView, Platform, TouchableOpacity, RefreshControl, Share, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
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
import RefreshLoadingAnimation from '@/components/dashboard/RefreshLoadingAnimation';
import AddFriendModal from '@/components/dashboard/AddFriendModal';
import FriendRequestsCard from '@/components/dashboard/FriendRequestsCard';
import PendingSentRequestsCard from '@/components/dashboard/PendingSentRequestsCard';
import CreateChallengeModal from '@/components/dashboard/CreateChallengeModal';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import {
  fetchLeaderboard, fetchFriendRequests, fetchSentRequests, fetchChallenges, fetchFeed, fetchInviteCode,
  LeaderboardEntry, FriendRequest, SentRequest, ChallengeData, FeedItem,
} from '@/services/api';

type Tab = 'friends' | 'challenges' | 'feed';

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
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareInvite = async () => {
    if (!inviteCode) return;
    await Share.share({
      message: `Join me on Lock! Use invite code「${inviteCode}」👉 lock://invite/${inviteCode}`,
      title: 'Join Lock',
    });
  };

  const loadAll = useCallback(async () => {
    const [lb, reqs, sent, ch, fd, ic] = await Promise.allSettled([
      fetchLeaderboard(),
      fetchFriendRequests(),
      fetchSentRequests(),
      fetchChallenges(),
      fetchFeed(),
      fetchInviteCode(),
    ]);
    if (lb.status === 'fulfilled') setLeaderboard(lb.value);
    if (reqs.status === 'fulfilled') setRequests(reqs.value);
    if (sent.status === 'fulfilled') setSentRequests(sent.value);
    if (ch.status === 'fulfilled') setChallenges(ch.value);
    if (fd.status === 'fulfilled') setFeed(fd.value);
    if (ic.status === 'fulfilled') setInviteCode(ic.value);
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

  const myEntry = leaderboard.find((e) => e.isMe);

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
    { key: 'feed', label: t('tabs.social'), icon: 'newspaper' },
  ];

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
          <RefreshLoadingAnimation visible={refreshing} />

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
              {/* Friend requests */}
              {requests.length > 0 && (
                <FriendRequestsCard requests={requests} onUpdate={loadAll} />
                <PendingSentRequestsCard requests={sentRequests} onUpdate={loadAll} />
              )}

              {/* Unified leaderboard (me + friends) */}
              <LeaderboardCard entries={leaderboardEntries} onFriendRemoved={loadAll} />

              {/* Invite Code Card */}
              <View style={{
                borderRadius: 24, padding: DIMENSIONS.SPACING * 1.2,
                backgroundColor: colors.cardBackground,
                borderWidth: 2, borderColor: colors.borderPrimary,
                marginBottom: DIMENSIONS.SPACING * 1.2,
              }}>
                {/* Label */}
                <Text style={{
                  fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '800',
                  color: colors.textSecondary, textTransform: 'uppercase',
                  letterSpacing: 1.2, marginBottom: DIMENSIONS.SPACING * 0.8,
                }}>
                  {t('dashboard.inviteCode') || 'Invite Code'}
                </Text>

                {/* Code display row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: DIMENSIONS.SPACING * 0.6, marginBottom: DIMENSIONS.SPACING * 0.8 }}>
                  {/* Code pill */}
                  <View style={{
                    flex: 1,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    backgroundColor: colors.cardBackgroundSecondary,
                    borderRadius: 14, paddingHorizontal: DIMENSIONS.SPACING * 1,
                    paddingVertical: DIMENSIONS.SPACING * 0.7,
                    borderWidth: 1.5, borderColor: colors.borderPrimary,
                  }}>
                    <Text style={{
                      fontSize: TYPOGRAPHY.bodyL, fontWeight: '900',
                      color: colors.textPrimary, letterSpacing: 5,
                    }}>
                      {inviteCode || '------'}
                    </Text>
                    <TouchableOpacity onPress={handleCopyCode} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons
                        name={copied ? 'checkmark-circle' : 'copy-outline'}
                        size={TYPOGRAPHY.iconXS}
                        color={copied ? '#10B981' : colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Share button */}
                  <TouchableOpacity
                    onPress={handleShareInvite}
                    style={{
                      width: 44, height: 44, borderRadius: 14,
                      backgroundColor: colors.cardBackgroundSecondary,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 1.5, borderColor: colors.borderPrimary,
                    }}
                  >
                    <Ionicons name="share-outline" size={TYPOGRAPHY.iconXS} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Hint text */}
                <Text style={{
                  fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '500',
                  color: colors.textSecondary, lineHeight: TYPOGRAPHY.bodyXXS * 1.6,
                }}>
                  {t('dashboard.inviteHint') || 'Share your code with friends so they can add you.'}
                </Text>
              </View>
            </>
          )}

          {/* ── Challenges Tab ── */}
          {!initialLoading && activeTab === 'challenges' && (
            <ChallengesList
              challenges={challengesForList}
              onCreateChallenge={() => setShowCreateChallenge(true)}
            />
          )}

          {/* ── Feed Tab ── */}
          {!initialLoading && activeTab === 'feed' && (
            <ActivityFeed items={feed} />
          )}
        </View>
      </ScrollView>

      {/* ── Floating Add Friend button ── */}
      <View style={{
        position: 'absolute', bottom: 24, left: DIMENSIONS.CARD_PADDING, right: DIMENSIONS.CARD_PADDING,
        pointerEvents: 'box-none',
      }}>
        <TouchableOpacity
          onPress={() => setShowAddFriend(true)}
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
          <Ionicons name="person-add-outline" size={TYPOGRAPHY.iconXS} color={colors.backgroundPrimary} />
          <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '900', color: colors.backgroundPrimary }}>
            {t('dashboard.addFriend')}
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
    </SafeAreaView>
  );
}
