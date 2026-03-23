import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { sendFriendRequest } from '@/services/api';

interface AddFriendModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddFriendModal({ visible, onClose, onSuccess }: AddFriendModalProps) {
  const colors = useTheme();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!identifier.trim()) return;
    setLoading(true);
    setError('');
    try {
      await sendFriendRequest(identifier.trim());
      setIdentifier('');
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error || '发送失败，请重试');
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
              添加好友
            </Text>

            {/* Search input */}
            <Text style={{
              fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700',
              color: colors.textSecondary, textTransform: 'uppercase',
              letterSpacing: 1, marginBottom: DIMENSIONS.SPACING * 0.6,
            }}>
              通过用户名或邀请码
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
                onChangeText={(v) => { setIdentifier(v); setError(''); }}
                placeholder="输入用户名或邀请码"
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
              <Text style={{
                fontSize: TYPOGRAPHY.bodyXS, color: '#EF4444',
                marginBottom: DIMENSIONS.SPACING, fontWeight: '600',
              }}>
                {error}
              </Text>
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
                  发送好友请求
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
