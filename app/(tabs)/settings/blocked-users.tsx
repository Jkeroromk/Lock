import { View, Image, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import UserAvatar from '@/components/ui/UserAvatar';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { BlockedUser, fetchBlockedUsers, unblockUser } from '@/services/api';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { t } = useTranslation();
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setUsers(await fetchBlockedUsers());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleUnblock = (user: BlockedUser) => {
    Alert.alert(t('block.unblock'), t('block.unblockConfirm', { name: user.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('block.unblock'),
        onPress: async () => {
          try {
            await unblockUser(user.id);
            setUsers((prev) => prev.filter((u) => u.id !== user.id));
          } catch {
            Alert.alert('', t('block.unblockFailed'));
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: DIMENSIONS.CARD_PADDING,
        paddingVertical: DIMENSIONS.SPACING,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: DIMENSIONS.SPACING }}>
          <Ionicons name="chevron-back" size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: colors.textPrimary }}>
          {t('block.blockedUsers')}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: DIMENSIONS.SPACING * 3 }} color={colors.textSecondary} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />}
        >
          {users.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: DIMENSIONS.SPACING * 3 }}>
              <Ionicons
                name={error ? 'cloud-offline-outline' : 'shield-checkmark-outline'}
                size={TYPOGRAPHY.iconM}
                color={colors.textSecondary}
              />
              <Text style={{
                fontSize: TYPOGRAPHY.bodyM, fontWeight: '700', color: colors.textSecondary,
                marginTop: DIMENSIONS.SPACING * 0.8, textAlign: 'center',
              }}>
                {error ? t('common.error') : t('block.empty')}
              </Text>
            </View>
          ) : (
            <View style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 20, borderWidth: 2, borderColor: colors.borderPrimary,
              paddingHorizontal: DIMENSIONS.SPACING,
            }}>
              {users.map((u, i) => (
                <View key={u.id} style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingVertical: DIMENSIONS.SPACING * 0.8,
                  borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.borderPrimary,
                }}>
                  <UserAvatar image={u.avatarImage} initial={u.avatar} status={u.status} size={40} style={{ marginRight: DIMENSIONS.SPACING * 0.8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '800', color: colors.textPrimary }}>{u.name}</Text>
                    {u.username ? (
                      <Text style={{ fontSize: TYPOGRAPHY.bodyXS, color: colors.textSecondary }}>@{u.username}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleUnblock(u)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 11,
                      borderWidth: 1, borderColor: colors.borderPrimary,
                      backgroundColor: colors.cardBackgroundSecondary,
                    }}
                  >
                    <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '800', color: colors.textPrimary }}>
                      {t('block.unblock')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
