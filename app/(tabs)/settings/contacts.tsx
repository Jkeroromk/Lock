import {
  View, Text, ScrollView, TouchableOpacity, Image, Share, Modal,
  StyleSheet, Animated, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { fetchLeaderboard, LeaderboardEntry } from '@/services/api';

// ── Shared Avatar ──────────────────────────────────────────────────────────────
function Avatar({ emoji, image, name, size = 48 }: {
  emoji?: string; image?: string | null; name: string; size?: number;
}) {
  const colors = useTheme();
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: colors.cardBackgroundSecondary,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      {image
        ? <Image source={{ uri: image }} style={{ width: size, height: size }} />
        : <Text style={{ fontSize: size * 0.42, fontWeight: '900', color: colors.textPrimary }}>
            {emoji || name.charAt(0).toUpperCase()}
          </Text>
      }
    </View>
  );
}

// ── Stat Pill ─────────────────────────────────────────────────────────────────
function StatPill({ icon, value, label, colors }: {
  icon: string; value: string | number; label: string; colors: any;
}) {
  return (
    <View style={{
      flex: 1, alignItems: 'center',
      backgroundColor: colors.cardBackgroundSecondary,
      borderRadius: 14, paddingVertical: DIMENSIONS.SPACING * 0.7,
      borderWidth: 1, borderColor: colors.borderSecondary,
    }}>
      <Text style={{ fontSize: 16 }}>{icon}</Text>
      <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary, marginTop: 2 }}>
        {value}
      </Text>
      <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textSecondary }}>
        {label}
      </Text>
    </View>
  );
}

// ── My Card ───────────────────────────────────────────────────────────────────
function MyCard({ user, todayCalories, colors, t }: {
  user: any; todayCalories: number; colors: any; t: (k: any, p?: any) => string;
}) {
  const handleShare = async () => {
    if (!user?.inviteCode) return;
    const msg = (t('settings.shareCardMessage' as any) as string).replace('{code}', user.inviteCode);
    try {
      await Share.share({ message: msg, url: `lock://invite/${user.inviteCode}` });
    } catch { /* user cancelled */ }
  };

  return (
    <View style={{
      backgroundColor: colors.cardBackground,
      borderRadius: 24, borderWidth: 2, borderColor: colors.borderPrimary,
      padding: DIMENSIONS.SPACING * 1.4,
      marginBottom: DIMENSIONS.SPACING * 1.4,
    }}>
      <Text style={{
        fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '800', color: colors.textSecondary,
        letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: DIMENSIONS.SPACING * 1.0,
      }}>
        {t('settings.myCard' as any)}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: DIMENSIONS.SPACING }}>
        <Avatar emoji={user?.avatarEmoji} image={user?.avatarImage} name={user?.name || 'U'} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: TYPOGRAPHY.title, fontWeight: '900', color: colors.textPrimary }}>
            {user?.name || '—'}
          </Text>
          {user?.username && (
            <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '600', color: colors.textSecondary, marginTop: 1 }}>
              @{user.username}
            </Text>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.6, marginTop: DIMENSIONS.SPACING * 1.0 }}>
        <StatPill icon="🔥" value={user?.streak ?? 0} label={t('settings.streak' as any)} colors={colors} />
        <StatPill icon="🏆" value={`#${user?.rank ?? '—'}`} label={t('settings.rank' as any)} colors={colors} />
        <StatPill icon="🍽️" value={todayCalories} label="kcal" colors={colors} />
      </View>

      {user?.inviteCode && (
        <TouchableOpacity
          onPress={handleShare}
          activeOpacity={0.85}
          style={{
            marginTop: DIMENSIONS.SPACING * 1.0,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            backgroundColor: colors.textPrimary,
            borderRadius: 16, paddingVertical: DIMENSIONS.SPACING * 0.75,
          }}
        >
          <Ionicons name="share-outline" size={18} color={colors.backgroundPrimary} />
          <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '900', color: colors.backgroundPrimary }}>
            {t('settings.shareMyCard' as any)}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Friend Row ────────────────────────────────────────────────────────────────
function FriendRow({ entry, onPress, colors, t }: {
  entry: LeaderboardEntry; onPress: () => void; colors: any; t: (k: any, p?: any) => string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.cardBackground,
        borderRadius: 18, borderWidth: 2, borderColor: colors.borderPrimary,
        padding: DIMENSIONS.SPACING * 1.0,
        marginBottom: DIMENSIONS.SPACING * 0.6,
        gap: DIMENSIONS.SPACING * 0.8,
      }}
    >
      <Avatar
        emoji={undefined}
        image={entry.avatarImage}
        name={entry.avatar}
        size={44}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '800', color: colors.textPrimary }}>
          {entry.name}
        </Text>
        <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.8, marginTop: 3 }}>
          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary }}>
            🔥 {entry.streak}{t('settings.days' as any)}
          </Text>
          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary }}>
            🏆 #{entry.rank}
          </Text>
          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary }}>
            🍽️ {entry.calories} kcal
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

// ── Friend Card Modal ─────────────────────────────────────────────────────────
function FriendCardModal({ entry, visible, onClose, colors, t }: {
  entry: LeaderboardEntry | null; visible: boolean; onClose: () => void; colors: any; t: (k: any, p?: any) => string;
}) {
  const [mounted, setMounted] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  if (!entry) return null;

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: fadeAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: colors.backgroundPrimary,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: DIMENSIONS.CARD_PADDING,
        paddingTop: DIMENSIONS.SPACING * 1.4,
        paddingBottom: Platform.OS === 'ios' ? 42 : 28,
        transform: [{ translateY: slideAnim }],
      }}>
        {/* drag handle */}
        <View style={{
          width: 36, height: 4, borderRadius: 2,
          backgroundColor: colors.borderPrimary,
          alignSelf: 'center', marginBottom: DIMENSIONS.SPACING * 1.2,
        }} />

        <Text style={{
          fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '800', color: colors.textSecondary,
          letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: DIMENSIONS.SPACING * 1.0,
        }}>
          {t('settings.friendCard' as any)}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: DIMENSIONS.SPACING, marginBottom: DIMENSIONS.SPACING * 1.2 }}>
          <Avatar emoji={undefined} image={entry.avatarImage} name={entry.avatar} size={64} />
          <View>
            <Text style={{ fontSize: TYPOGRAPHY.title, fontWeight: '900', color: colors.textPrimary }}>
              {entry.name}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.6 }}>
          <StatPill icon="🔥" value={`${entry.streak}${t('settings.days' as any)}`} label={t('settings.streak' as any)} colors={colors} />
          <StatPill icon="🏆" value={`#${entry.rank}`} label={t('settings.rank' as any)} colors={colors} />
          <StatPill icon="🍽️" value={entry.calories} label="kcal" colors={colors} />
        </View>
      </Animated.View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ContactsScreen() {
  const router = useRouter();
  const { user, todayCalories } = useStore();
  const { t } = useTranslation();
  const colors = useTheme();

  const [friends, setFriends] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LeaderboardEntry | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Inject own rank into user display (from leaderboard)
  const [myRank, setMyRank] = useState<number | undefined>();

  useEffect(() => {
    fetchLeaderboard()
      .then((data) => {
        const me = data.find((e) => e.isMe);
        if (me) setMyRank(me.rank);
        setFriends(data.filter((e) => !e.isMe));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleFriendPress = (entry: LeaderboardEntry) => {
    setSelected(entry);
    setShowModal(true);
  };

  const userWithRank = user ? { ...user, rank: myRank } : user;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundPrimary }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: DIMENSIONS.CARD_PADDING,
        paddingVertical: DIMENSIONS.SPACING * 0.8,
        borderBottomWidth: 1, borderBottomColor: colors.borderPrimary,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={TYPOGRAPHY.iconXS} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>
          {t('settings.contacts' as any)}
        </Text>
        <View style={{ width: TYPOGRAPHY.iconXS }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: DIMENSIONS.CARD_PADDING, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* My Card */}
        <MyCard user={userWithRank} todayCalories={todayCalories} colors={colors} t={t as any} />

        {/* Friends */}
        <Text style={{
          fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '800', color: colors.textSecondary,
          letterSpacing: 1.5, textTransform: 'uppercase',
          marginBottom: DIMENSIONS.SPACING * 0.8,
        }}>
          {t('dashboard.friends')} · {friends.length}
        </Text>

        {loading && (
          <View style={{ paddingVertical: DIMENSIONS.SPACING * 3, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.textPrimary} />
          </View>
        )}

        {!loading && friends.length === 0 && (
          <View style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 20, borderWidth: 2, borderColor: colors.borderPrimary,
            padding: DIMENSIONS.SPACING * 2, alignItems: 'center',
          }}>
            <Ionicons name="people-outline" size={TYPOGRAPHY.iconM} color={colors.textSecondary} />
            <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '700', color: colors.textSecondary, marginTop: DIMENSIONS.SPACING * 0.8 }}>
              {t('settings.noFriends' as any)}
            </Text>
            <Text style={{ fontSize: TYPOGRAPHY.bodyS, color: colors.textSecondary, marginTop: 4 }}>
              {t('settings.noFriendsHint' as any)}
            </Text>
          </View>
        )}

        {!loading && friends.map((entry) => (
          <FriendRow
            key={entry.id}
            entry={entry}
            onPress={() => handleFriendPress(entry)}
            colors={colors}
            t={t as any}
          />
        ))}
      </ScrollView>

      <FriendCardModal
        entry={selected}
        visible={showModal}
        onClose={() => setShowModal(false)}
        colors={colors}
        t={t as any}
      />
    </SafeAreaView>
  );
}
