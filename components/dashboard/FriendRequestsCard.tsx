import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { FriendRequest, respondFriendRequest } from '@/services/api';
import { useTranslation } from '@/i18n';

interface FriendRequestsCardProps {
  requests: FriendRequest[];
  onUpdate: () => void;
}

export default function FriendRequestsCard({ requests, onUpdate }: FriendRequestsCardProps) {
  const colors = useTheme();
  const { t } = useTranslation();

  if (requests.length === 0) return null;

  const handleRespond = async (id: string, action: 'accept' | 'reject') => {
    try {
      await respondFriendRequest(id, action);
      onUpdate();
    } catch {}
  };

  return (
    <View style={{
      borderRadius: 24, padding: DIMENSIONS.SPACING * 1.2,
      marginBottom: DIMENSIONS.SPACING * 1.2,
      backgroundColor: colors.cardBackground,
      borderWidth: 2, borderColor: colors.borderPrimary,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DIMENSIONS.SPACING }}>
        <View style={{
          width: 32, height: 32, borderRadius: 10,
          backgroundColor: colors.cardBackgroundSecondary,
          alignItems: 'center', justifyContent: 'center',
          marginRight: DIMENSIONS.SPACING * 0.6,
        }}>
          <Ionicons name="person-add" size={TYPOGRAPHY.iconXS} color={colors.textPrimary} />
        </View>
        <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>
          {t('dashboard.friendRequests' as any)}
        </Text>
        <View style={{
          marginLeft: DIMENSIONS.SPACING * 0.6,
          backgroundColor: '#EF4444', borderRadius: 10,
          paddingHorizontal: 6, paddingVertical: 2,
        }}>
          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '900', color: '#fff' }}>
            {requests.length}
          </Text>
        </View>
      </View>

      {requests.map((req, i) => (
        <View key={req.id} style={{
          flexDirection: 'row', alignItems: 'center',
          paddingVertical: DIMENSIONS.SPACING * 0.8,
          borderTopWidth: i > 0 ? 1 : 0,
          borderTopColor: colors.borderPrimary,
        }}>
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: colors.cardBackgroundSecondary,
            alignItems: 'center', justifyContent: 'center',
            marginRight: DIMENSIONS.SPACING * 0.8,
          }}>
            <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>
              {req.from.avatar}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>
              {req.from.name}
            </Text>
            {req.from.username && (
              <Text style={{ fontSize: TYPOGRAPHY.bodyXS, color: colors.textSecondary }}>
                @{req.from.username}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => handleRespond(req.id, 'accept')}
            style={{
              width: 36, height: 36, borderRadius: 11,
              backgroundColor: colors.textPrimary,
              alignItems: 'center', justifyContent: 'center',
              marginRight: DIMENSIONS.SPACING * 0.5,
            }}
          >
            <Ionicons name="checkmark" size={TYPOGRAPHY.iconXS} color={colors.backgroundPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleRespond(req.id, 'reject')}
            style={{
              width: 36, height: 36, borderRadius: 11,
              backgroundColor: colors.cardBackgroundSecondary,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: colors.borderPrimary,
            }}
          >
            <Ionicons name="close" size={TYPOGRAPHY.iconXS} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}
