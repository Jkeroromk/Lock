import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { sendFriendRequest } from '@/services/api';
import { useStore } from '@/store/useStore';
import { getQuota } from '@/lib/plans';
import { useTranslation } from '@/i18n';

interface AddFriendModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddFriendModal({ visible, onClose, onSuccess }: AddFriendModalProps) {
  const colors = useTheme();
  const router = useRouter();
  const { user } = useStore();
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLimitError, setIsLimitError] = useState(false);

  const plan = user?.plan ?? 'FREE';
  const friendQuota = getQuota(plan, 'maxFriends'); // -1 = unlimited

  const handleSend = async () => {
    if (!identifier.trim()) return;
    setLoading(true);
    setError('');
    setIsLimitError(false);
    try {
      await sendFriendRequest(identifier.trim());
      setIdentifier('');
      onSuccess();
      onClose();
    } catch (e: any) {
      const errCode = e.response?.data?.error;
      if (errCode === 'FRIEND_LIMIT_REACHED') {
        setError(t('dashboard.friendLimitReached' as any).replace('{quota}', String(friendQuota)));
        setIsLimitError(true);
      } else {
        setError(t('dashboard.sendFailed' as any));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={onClose}
        >
        <TouchableOpacity activeOpacity={1}>
          <View style={{
            backgroundColor: colors.backgroundPrimary,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            padding: DIMENSIONS.CARD_PADDING,
            paddingBottom: DIMENSIONS.CARD_PADDING * 2,
          }}>
            {/* Handle */}
            <View style={{
              width: 40, height: 4, borderRadius: 2,
              backgroundColor: colors.borderPrimary,
              alignSelf: 'center',
              marginBottom: DIMENSIONS.SPACING * 1.2,
            }} />

            <Text style={{
              fontSize: TYPOGRAPHY.bodyL, fontWeight: '900',
              color: colors.textPrimary, marginBottom: DIMENSIONS.SPACING * 1.5,
            }}>
              {t('dashboard.addFriend')}
            </Text>

            {/* Search input */}
            <Text style={{
              fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700',
              color: colors.textSecondary, textTransform: 'uppercase',
              letterSpacing: 1, marginBottom: DIMENSIONS.SPACING * 0.6,
            }}>
              {t('dashboard.addFriendByUsername' as any)}
            </Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              borderRadius: 16, borderWidth: 2, borderColor: colors.borderPrimary,
              backgroundColor: colors.cardBackground,
              paddingHorizontal: DIMENSIONS.SPACING,
              marginBottom: error ? DIMENSIONS.SPACING * 0.6 : DIMENSIONS.SPACING * 1.5,
            }}>
              <Ionicons name="search" size={TYPOGRAPHY.iconXS} color={colors.textSecondary} />
              <TextInput
                value={identifier}
                onChangeText={(v) => { setIdentifier(v); setError(''); setIsLimitError(false); }}
                placeholder={t('dashboard.searchPlaceholder' as any)}
                placeholderTextColor={colors.textSecondary}
                style={{
                  flex: 1, paddingVertical: DIMENSIONS.SPACING * 0.9,
                  paddingHorizontal: DIMENSIONS.SPACING * 0.6,
                  fontSize: TYPOGRAPHY.bodyM, color: colors.textPrimary,
                }}
                autoCapitalize="none"
              />
            </View>

            {error ? (
              <View style={{ marginBottom: DIMENSIONS.SPACING }}>
                <Text style={{
                  fontSize: TYPOGRAPHY.bodyXS, color: '#EF4444', fontWeight: '600',
                  marginBottom: isLimitError ? DIMENSIONS.SPACING * 0.5 : 0,
                }}>
                  {error}
                </Text>
                {isLimitError && (
                  <TouchableOpacity
                    onPress={() => { onClose(); router.push('/(tabs)/settings/pricing'); }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                      paddingVertical: DIMENSIONS.SPACING * 0.4,
                      paddingHorizontal: DIMENSIONS.SPACING * 0.8,
                      backgroundColor: '#F59E0B22', borderRadius: 8, alignSelf: 'flex-start',
                    }}
                  >
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '800', color: '#F59E0B' }}>
                      {t('dashboard.upgradePro' as any)}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleSend}
              disabled={loading || !identifier.trim()}
              style={{
                borderRadius: 16, paddingVertical: DIMENSIONS.SPACING * 0.9,
                backgroundColor: identifier.trim() ? colors.textPrimary : colors.cardBackgroundSecondary,
                alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 1.5,
              }}
            >
              {loading ? (
                <ActivityIndicator color={colors.backgroundPrimary} />
              ) : (
                <Text style={{
                  fontSize: TYPOGRAPHY.bodyM, fontWeight: '900',
                  color: identifier.trim() ? colors.backgroundPrimary : colors.textSecondary,
                }}>
                  {t('dashboard.sendFriendRequest' as any)}
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
