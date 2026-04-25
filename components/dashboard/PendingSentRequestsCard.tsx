import { View, Text, Image, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { SentRequest, cancelFriendRequest } from '@/services/api';
import { useTranslation } from '@/i18n';

interface Props {
  requests: SentRequest[];
  onUpdate: () => void;
}

export default function PendingSentRequestsCard({ requests, onUpdate }: Props) {
  const colors = useTheme();
  const { t } = useTranslation();

  if (requests.length === 0) return null;

  const handleCancel = (req: SentRequest) => {
    Alert.alert(
      t('dashboard.cancelRequest' as any),
      t('dashboard.cancelRequestConfirm' as any, { name: req.to.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('dashboard.cancelRequestBtn' as any),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelFriendRequest(req.id);
              onUpdate();
            } catch {}
          },
        },
      ]
    );
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
          <Ionicons name="time-outline" size={TYPOGRAPHY.iconXS} color={colors.textPrimary} />
        </View>
        <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>
          {t('dashboard.pendingSent' as any)}
        </Text>
        <View style={{
          marginLeft: DIMENSIONS.SPACING * 0.6,
          backgroundColor: colors.cardBackgroundSecondary,
          borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2,
          borderWidth: 1, borderColor: colors.borderPrimary,
        }}>
          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '900', color: colors.textPrimary }}>
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
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: colors.cardBackgroundSecondary,
            alignItems: 'center', justifyContent: 'center',
            marginRight: DIMENSIONS.SPACING * 0.8, overflow: 'hidden',
          }}>
            {req.to.avatarImage ? (
              <Image source={{ uri: req.to.avatarImage }} style={{ width: 40, height: 40 }} />
            ) : (
              <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>
                {req.to.avatar}
              </Text>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>
              {req.to.name}
            </Text>
            {req.to.username && (
              <Text style={{ fontSize: TYPOGRAPHY.bodyXS, color: colors.textSecondary }}>
                @{req.to.username}
              </Text>
            )}
          </View>

          {/* Pending badge */}
          <View style={{
            paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
            backgroundColor: colors.cardBackgroundSecondary,
            borderWidth: 1, borderColor: colors.borderPrimary,
            marginRight: DIMENSIONS.SPACING * 0.5,
          }}>
            <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary }}>
              {t('dashboard.pending' as any)}
            </Text>
          </View>

          {/* Cancel button */}
          <TouchableOpacity
            onPress={() => handleCancel(req)}
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
