import {
  View, Text, Image, TextInput, TouchableOpacity, Modal,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { searchUser, sendFriendRequest } from '@/services/api';
import { useStore } from '@/store/useStore';
import { getQuota } from '@/lib/plans';
import { useTranslation } from '@/i18n';

interface AddFriendModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialValue?: string;
}

type RelationStatus = 'none' | 'friends' | 'pending_sent' | 'pending_received';

interface FoundUser {
  id: string;
  name: string;
  username: string | null;
  avatarEmoji: string;
  avatarImage?: string | null;
  bio?: string | null;
}

export default function AddFriendModal({ visible, onClose, onSuccess, initialValue }: AddFriendModalProps) {
  const colors = useTheme();
  const router = useRouter();
  const { user } = useStore();
  const { t } = useTranslation();

  const [query, setQuery] = useState(initialValue ?? '');
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [relationStatus, setRelationStatus] = useState<RelationStatus>('none');
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [isLimitError, setIsLimitError] = useState(false);
  const [sent, setSent] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const plan = user?.plan ?? 'FREE';
  const friendQuota = getQuota(plan, 'maxFriends');

  useEffect(() => { if (initialValue) setQuery(initialValue); }, [initialValue]);

  useEffect(() => {
    if (!visible) {
      setQuery(''); setFoundUser(null); setNotFound(false);
      setError(''); setIsLimitError(false); setSent(false); setRelationStatus('none');
    }
  }, [visible]);

  const doSearch = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setFoundUser(null); setNotFound(false); setError(''); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true); setFoundUser(null); setNotFound(false); setError(''); setSent(false);
      try {
        const res = await searchUser(q.trim());
        if (res.self) { setNotFound(true); }
        else if (res.user) { setFoundUser(res.user); setRelationStatus(res.relationStatus ?? 'none'); }
        else { setNotFound(true); }
      } catch { setNotFound(true); }
      finally { setSearching(false); }
    }, 500);
  };

  const handleChangeText = (v: string) => {
    const cleaned = v.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setQuery(cleaned);
    doSearch(cleaned);
  };

  const handleSend = async () => {
    if (!foundUser) return;
    setSending(true); setError(''); setIsLimitError(false);
    try {
      await sendFriendRequest(foundUser.username ?? foundUser.id);
      setSent(true); setRelationStatus('pending_sent'); onSuccess();
    } catch (e: any) {
      const errCode = e.response?.data?.error;
      if (errCode === 'FRIEND_LIMIT_REACHED') {
        setError((t('dashboard.friendLimitReached' as any) as string).replace('{quota}', String(friendQuota)));
        setIsLimitError(true);
      } else {
        setError(e.response?.data?.message || t('dashboard.sendFailed' as any));
      }
    } finally { setSending(false); }
  };

  const relationLabel = (): { text: string; icon: string; color: string } | null => {
    if (sent || relationStatus === 'pending_sent') return { text: t('dashboard.requestSent' as any), icon: 'time-outline', color: colors.textSecondary };
    if (relationStatus === 'friends') return { text: t('dashboard.alreadyFriends' as any), icon: 'checkmark-circle', color: '#10B981' };
    if (relationStatus === 'pending_received') return { text: t('dashboard.pendingYourApproval' as any), icon: 'person-add', color: '#F59E0B' };
    return null;
  };

  const canSend = !!foundUser && relationStatus === 'none' && !sent && !sending;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          activeOpacity={1} onPress={onClose}
        >
          <TouchableOpacity activeOpacity={1}>
            <View style={{
              backgroundColor: colors.backgroundPrimary,
              borderTopLeftRadius: 32, borderTopRightRadius: 32,
              padding: DIMENSIONS.CARD_PADDING, paddingBottom: DIMENSIONS.CARD_PADDING * 2,
              borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: colors.borderPrimary,
            }}>
              {/* Handle */}
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderPrimary, alignSelf: 'center', marginBottom: DIMENSIONS.SPACING * 1.2 }} />

              <Text style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: colors.textPrimary, marginBottom: DIMENSIONS.SPACING * 1.5 }}>
                {t('dashboard.addFriend')}
              </Text>

              {/* Label */}
              <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: DIMENSIONS.SPACING * 0.6 }}>
                {t('dashboard.addFriendByUsername' as any)}
              </Text>

              {/* Input */}
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                borderRadius: 16, borderWidth: 2, borderColor: colors.borderPrimary,
                backgroundColor: colors.cardBackground, paddingHorizontal: DIMENSIONS.SPACING,
                marginBottom: DIMENSIONS.SPACING * 1.2,
              }}>
                <Text style={{ fontSize: TYPOGRAPHY.bodyM, color: colors.textSecondary, fontWeight: '700' }}>@</Text>
                <TextInput
                  value={query}
                  onChangeText={handleChangeText}
                  placeholder={t('dashboard.searchPlaceholder' as any)}
                  placeholderTextColor={colors.textSecondary}
                  style={{ flex: 1, paddingVertical: DIMENSIONS.SPACING * 0.9, paddingHorizontal: DIMENSIONS.SPACING * 0.5, fontSize: TYPOGRAPHY.bodyM, color: colors.textPrimary }}
                  autoCapitalize="none" autoCorrect={false}
                />
                {searching && <ActivityIndicator size="small" color={colors.textSecondary} />}
                {!searching && query.length > 0 && (
                  <TouchableOpacity onPress={() => { setQuery(''); setFoundUser(null); setNotFound(false); setError(''); }}>
                    <Ionicons name="close-circle" size={TYPOGRAPHY.iconXS} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* User preview card */}
              {foundUser && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  padding: DIMENSIONS.SPACING, backgroundColor: colors.cardBackground,
                  borderRadius: 18, borderWidth: 2, borderColor: colors.borderPrimary,
                  marginBottom: DIMENSIONS.SPACING * 1.2, gap: DIMENSIONS.SPACING * 0.8,
                }}>
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.cardBackgroundSecondary, borderWidth: 2, borderColor: colors.borderPrimary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {foundUser.avatarImage ? (
                      <Image source={{ uri: foundUser.avatarImage }} style={{ width: 48, height: 48 }} />
                    ) : (
                      <Text style={{ fontSize: 24 }}>{foundUser.avatarEmoji}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>{foundUser.name}</Text>
                    {foundUser.username ? <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '600', color: colors.textSecondary }}>@{foundUser.username}</Text> : null}
                    {foundUser.bio ? <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>{foundUser.bio}</Text> : null}
                  </View>
                  {(() => {
                    const rel = relationLabel();
                    return rel ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name={rel.icon as any} size={14} color={rel.color} />
                        <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '800', color: rel.color }}>{rel.text}</Text>
                      </View>
                    ) : null;
                  })()}
                </View>
              )}

              {/* Not found */}
              {notFound && query.length > 0 && !searching && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: DIMENSIONS.SPACING, backgroundColor: colors.cardBackground, borderRadius: 14, borderWidth: 1, borderColor: colors.borderPrimary, marginBottom: DIMENSIONS.SPACING * 1.2 }}>
                  <Ionicons name="person-outline" size={TYPOGRAPHY.iconXS} color={colors.textSecondary} />
                  <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '600', color: colors.textSecondary }}>{t('dashboard.userNotFound' as any)}</Text>
                </View>
              )}

              {/* Error */}
              {error ? (
                <View style={{ marginBottom: DIMENSIONS.SPACING }}>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyXS, color: '#EF4444', fontWeight: '600', marginBottom: isLimitError ? DIMENSIONS.SPACING * 0.5 : 0 }}>{error}</Text>
                  {isLimitError && (
                    <TouchableOpacity onPress={() => { onClose(); router.push('/(tabs)/settings/pricing'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: DIMENSIONS.SPACING * 0.4, paddingHorizontal: DIMENSIONS.SPACING * 0.8, backgroundColor: '#F59E0B22', borderRadius: 8, alignSelf: 'flex-start' }}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '800', color: '#F59E0B' }}>{t('dashboard.upgradePro' as any)}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}

              {/* Send button */}
              <TouchableOpacity onPress={handleSend} disabled={!canSend} style={{ borderRadius: 16, paddingVertical: DIMENSIONS.SPACING * 0.9, backgroundColor: canSend ? colors.textPrimary : colors.cardBackgroundSecondary, alignItems: 'center' }}>
                {sending ? <ActivityIndicator color={colors.backgroundPrimary} /> : (
                  <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: canSend ? colors.backgroundPrimary : colors.textSecondary }}>
                    {sent ? t('dashboard.sentBtn' as any) : t('dashboard.sendFriendRequest' as any)}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}
