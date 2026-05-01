import { View, Text, Image, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTranslation } from '@/i18n';
import { Moment, MomentComment, toggleMomentLike, deleteMoment, addMomentComment, fetchMomentComments, reportMoment } from '@/services/api';

interface Props {
  items: Moment[];
  onRefresh: () => void;
  onCreatePress: () => void;
}

function timeAgo(dateStr: string, t: (k: any) => any): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('feed.justNow' as any);
  if (mins < 60) return (t('feed.minutesAgo' as any) as string).replace('{mins}', String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return (t('feed.hoursAgo' as any) as string).replace('{hours}', String(hours));
  return (t('feed.daysAgo' as any) as string).replace('{days}', String(Math.floor(hours / 24)));
}

function Avatar({ user, size = 40 }: { user: Moment['user']; size?: number }) {
  const colors = useTheme();
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: colors.cardBackgroundSecondary,
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {user.avatarImage
        ? <Image source={{ uri: user.avatarImage }} style={{ width: size, height: size }} />
        : <Text style={{ fontSize: size * 0.42, fontWeight: '900', color: colors.textPrimary }}>{user.avatar}</Text>
      }
    </View>
  );
}

interface MomentCardProps {
  item: Moment;
  onLikeToggle: (id: string, liked: boolean, count: number) => void;
  onDelete: (id: string) => void;
  onCommentAdded: (id: string, comment: MomentComment) => void;
}

function MomentCard({ item, onLikeToggle, onDelete, onCommentAdded }: MomentCardProps) {
  const colors = useTheme();
  const { t } = useTranslation();
  const [liking, setLiking] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [allComments, setAllComments] = useState<MomentComment[] | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    try {
      const res = await toggleMomentLike(item.id);
      onLikeToggle(item.id, res.liked, res.count);
    } catch {
      // silent
    } finally {
      setLiking(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('moments.delete' as any),
      t('moments.deleteConfirm' as any),
      [
        { text: t('settings.cancel' as any), style: 'cancel' },
        {
          text: t('moments.delete' as any),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMoment(item.id);
              onDelete(item.id);
            } catch {
              Alert.alert('', t('moments.deleteFailed' as any));
            }
          },
        },
      ]
    );
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || sendingComment) return;
    setSendingComment(true);
    try {
      const comment = await addMomentComment(item.id, commentText.trim());
      setCommentText('');
      setShowCommentInput(false);
      onCommentAdded(item.id, comment);
      if (allComments !== null) setAllComments([...allComments, comment]);
    } catch {
      Alert.alert('', t('moments.commentFailed' as any));
    } finally {
      setSendingComment(false);
    }
  };

  const handleShowOwnOptions = () => {
    Alert.alert(t('moments.moreOptions' as any), undefined, [
      { text: t('moments.delete' as any), style: 'destructive', onPress: handleDelete },
      { text: t('settings.cancel' as any), style: 'cancel' },
    ]);
  };

  const handleShowReportOptions = () => {
    Alert.alert(t('moments.reportReason' as any), undefined, [
      { text: t('moments.reportReasonSpam' as any), onPress: () => handleReport(t('moments.reportReasonSpam' as any)) },
      { text: t('moments.reportReasonInappropriate' as any), onPress: () => handleReport(t('moments.reportReasonInappropriate' as any)) },
      { text: t('moments.reportReasonHarassment' as any), onPress: () => handleReport(t('moments.reportReasonHarassment' as any)) },
      { text: t('moments.reportReasonOther' as any), onPress: () => handleReport(t('moments.reportReasonOther' as any)) },
      { text: t('settings.cancel' as any), style: 'cancel' },
    ]);
  };

  const handleReport = async (reason: string) => {
    try {
      await reportMoment(item.id, reason);
      Alert.alert('', t('moments.reportSuccess' as any));
    } catch {
      Alert.alert('', t('moments.reportFailed' as any));
    }
  };

  const handleViewAllComments = async () => {
    if (allComments !== null) {
      setAllComments(null);
      return;
    }
    setLoadingComments(true);
    try {
      const comments = await fetchMomentComments(item.id);
      setAllComments(comments);
    } catch {
      // silent
    } finally {
      setLoadingComments(false);
    }
  };

  const displayedComments = allComments ?? item.previewComments;
  const hasMoreComments = allComments === null && item.commentsCount > item.previewComments.length;

  return (
    <View style={{
      backgroundColor: colors.cardBackground,
      borderRadius: 20, borderWidth: 2, borderColor: colors.borderPrimary,
      marginBottom: DIMENSIONS.SPACING * 0.8,
      overflow: 'hidden',
    }}>
      {/* Header: avatar + name + time + delete */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: DIMENSIONS.SPACING * 1.0,
        paddingTop: DIMENSIONS.SPACING * 0.9,
        paddingBottom: DIMENSIONS.SPACING * 0.5,
      }}>
        <Avatar user={item.user} size={38} />
        <View style={{ flex: 1, marginLeft: DIMENSIONS.SPACING * 0.65 }}>
          <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '800', color: colors.textPrimary }}>
            {item.user.name}
          </Text>
          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary, marginTop: 1 }}>
            {timeAgo(item.createdAt, t)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={item.isMe ? handleShowOwnOptions : handleShowReportOptions}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <Text style={{
        fontSize: TYPOGRAPHY.bodyM, color: colors.textPrimary, lineHeight: TYPOGRAPHY.bodyM * 1.55,
        paddingHorizontal: DIMENSIONS.SPACING * 1.0,
        paddingBottom: item.mediaUrl ? DIMENSIONS.SPACING * 0.5 : DIMENSIONS.SPACING * 0.9,
      }}>
        {item.content}
      </Text>

      {/* Media */}
      {item.mediaUrl && (
        <Image
          source={{ uri: item.mediaUrl }}
          style={{
            width: '100%', aspectRatio: 4 / 3,
            marginBottom: DIMENSIONS.SPACING * 0.9,
          }}
          resizeMode="cover"
        />
      )}

      {/* Action row */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: DIMENSIONS.SPACING * 1.0,
        paddingVertical: DIMENSIONS.SPACING * 0.6,
        borderTopWidth: 1, borderTopColor: colors.borderPrimary,
        gap: DIMENSIONS.SPACING * 1.2,
      }}>
        <TouchableOpacity
          onPress={handleLike}
          disabled={liking}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Ionicons
            name={item.isLiked ? 'heart' : 'heart-outline'}
            size={18}
            color={item.isLiked ? '#EF4444' : colors.textSecondary}
          />
          {item.likesCount > 0 && (
            <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: item.isLiked ? '#EF4444' : colors.textSecondary }}>
              {item.likesCount}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowCommentInput((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Ionicons name="chatbubble-outline" size={17} color={colors.textSecondary} />
          {item.commentsCount > 0 && (
            <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textSecondary }}>
              {item.commentsCount}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Comments section */}
      {(displayedComments.length > 0 || hasMoreComments || loadingComments) && (
        <View style={{ paddingHorizontal: DIMENSIONS.SPACING * 1.0, paddingBottom: DIMENSIONS.SPACING * 0.8, gap: 6 }}>
          {displayedComments.map((c) => (
            <View key={c.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '800', color: colors.textPrimary }}>
                {c.user.name}:
              </Text>
              <Text style={{ flex: 1, fontSize: TYPOGRAPHY.bodyXS, color: colors.textPrimary, lineHeight: TYPOGRAPHY.bodyXS * 1.5 }}>
                {c.content}
              </Text>
            </View>
          ))}

          {loadingComments && <ActivityIndicator size="small" color={colors.textSecondary} />}

          {hasMoreComments && (
            <TouchableOpacity onPress={handleViewAllComments}>
              <Text style={{ fontSize: TYPOGRAPHY.bodyXS, color: colors.textSecondary, fontWeight: '600' }}>
                {(t('moments.viewAllComments' as any) as string).replace('{count}', String(item.commentsCount))}
              </Text>
            </TouchableOpacity>
          )}
          {allComments !== null && (
            <TouchableOpacity onPress={() => setAllComments(null)}>
              <Text style={{ fontSize: TYPOGRAPHY.bodyXS, color: colors.textSecondary, fontWeight: '600' }}>
                {t('settings.hideDetails' as any)}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Comment input */}
      {showCommentInput && (
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: DIMENSIONS.SPACING * 1.0,
          paddingBottom: DIMENSIONS.SPACING * 0.8,
          gap: 8,
          borderTopWidth: 1, borderTopColor: colors.borderPrimary,
          paddingTop: DIMENSIONS.SPACING * 0.6,
        }}>
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder={t('moments.addComment' as any)}
            placeholderTextColor={colors.textSecondary}
            autoFocus
            style={{
              flex: 1,
              backgroundColor: colors.cardBackgroundSecondary,
              borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7,
              fontSize: TYPOGRAPHY.bodyXS, color: colors.textPrimary,
            }}
          />
          <TouchableOpacity
            onPress={handleSendComment}
            disabled={!commentText.trim() || sendingComment}
          >
            {sendingComment
              ? <ActivityIndicator size="small" color={colors.textPrimary} />
              : <Ionicons
                  name="send"
                  size={20}
                  color={commentText.trim() ? colors.textPrimary : colors.textSecondary}
                />
            }
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function MomentsFeed({ items, onRefresh, onCreatePress }: Props) {
  const colors = useTheme();
  const { t } = useTranslation();
  const [moments, setMoments] = useState<Moment[]>(items);

  // Sync when parent refreshes
  if (items !== moments && items.length !== moments.length) {
    setMoments(items);
  }

  const handleLikeToggle = (id: string, liked: boolean, count: number) => {
    setMoments((prev) =>
      prev.map((m) => m.id === id ? { ...m, isLiked: liked, likesCount: count } : m)
    );
  };

  const handleDelete = (id: string) => {
    setMoments((prev) => prev.filter((m) => m.id !== id));
  };

  const handleCommentAdded = (id: string, comment: MomentComment) => {
    setMoments((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              commentsCount: m.commentsCount + 1,
              previewComments: m.previewComments.length < 3
                ? [...m.previewComments, comment]
                : m.previewComments,
            }
          : m
      )
    );
  };

  if (moments.length === 0) {
    return (
      <View style={{
        borderRadius: 24, padding: DIMENSIONS.SPACING * 2,
        backgroundColor: colors.cardBackground,
        borderWidth: 2, borderColor: colors.borderPrimary,
        alignItems: 'center',
      }}>
        <Ionicons name="images-outline" size={TYPOGRAPHY.iconM} color={colors.textSecondary} />
        <Text style={{
          fontSize: TYPOGRAPHY.bodyM, fontWeight: '700',
          color: colors.textSecondary, marginTop: DIMENSIONS.SPACING * 0.8,
          textAlign: 'center',
        }}>
          {t('moments.empty' as any)}
        </Text>
      </View>
    );
  }

  return (
    <View>
      {moments.map((item) => (
        <MomentCard
          key={item.id}
          item={item}
          onLikeToggle={handleLikeToggle}
          onDelete={handleDelete}
          onCommentAdded={handleCommentAdded}
        />
      ))}
    </View>
  );
}
