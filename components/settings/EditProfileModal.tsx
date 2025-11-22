import { View, Text, Modal, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';

interface User {
  id?: string;
  name?: string;
  email?: string;
}

interface EditProfileModalProps {
  visible: boolean;
  user: User | null;
  onSave: (name: string, email: string) => void;
  onCancel: () => void;
}

export default function EditProfileModal({
  visible,
  user,
  onSave,
  onCancel,
}: EditProfileModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (visible && user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [visible, user]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(t('settings.error'), t('settings.nameRequired'));
      return;
    }
    if (!email.trim()) {
      Alert.alert(t('settings.error'), t('settings.emailRequired'));
      return;
    }
    // 简单的邮箱验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(t('settings.error'), t('settings.invalidEmail'));
      return;
    }
    onSave(name.trim(), email.trim());
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: DIMENSIONS.CARD_PADDING,
      }}>
        <View 
          style={{ 
            width: '100%',
            maxWidth: DIMENSIONS.SCREEN_WIDTH * 0.85,
            backgroundColor: COLORS.cardBackground,
            borderRadius: 20,
            padding: DIMENSIONS.SPACING * 1.5,
            borderWidth: 2,
            borderColor: COLORS.borderPrimary,
            shadowColor: COLORS.shadowColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          {/* Header */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: DIMENSIONS.SPACING * 1.2,
          }}>
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.title,
                fontWeight: '900',
                color: COLORS.textPrimary,
              }}
            >
              {t('settings.editProfile')}
            </Text>
            <TouchableOpacity
              onPress={onCancel}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: COLORS.cardBackgroundSecondary,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: COLORS.borderSecondary,
              }}
            >
              <Ionicons name="close" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Avatar Section */}
          <View style={{ alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 1.2 }}>
            <View 
              style={{ 
                width: DIMENSIONS.SCREEN_WIDTH * 0.2,
                height: DIMENSIONS.SCREEN_WIDTH * 0.2,
                borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: COLORS.cardBackgroundSecondary,
                borderWidth: 2,
                borderColor: COLORS.borderSecondary,
                marginBottom: DIMENSIONS.SPACING * 0.6,
              }}
            >
              <Ionicons name="person" size={TYPOGRAPHY.iconL} color={COLORS.textPrimary} />
            </View>
            <TouchableOpacity
              style={{
                paddingHorizontal: DIMENSIONS.SPACING * 0.8,
                paddingVertical: DIMENSIONS.SPACING * 0.4,
                borderRadius: 12,
                backgroundColor: COLORS.cardBackgroundSecondary,
                borderWidth: 1,
                borderColor: COLORS.borderSecondary,
              }}
            >
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyXS,
                  fontWeight: '700',
                  color: COLORS.textPrimary,
                }}
              >
                {t('settings.changeAvatar')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Name Input */}
          <View style={{ marginBottom: DIMENSIONS.SPACING * 0.8 }}>
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.bodyXS,
                fontWeight: '700',
                color: COLORS.textPrimary,
                marginBottom: DIMENSIONS.SPACING * 0.4,
              }}
            >
              {t('settings.name')}
            </Text>
            <TextInput
              style={{
                width: '100%',
                padding: DIMENSIONS.SPACING * 0.9,
                backgroundColor: COLORS.cardBackgroundSecondary,
                borderRadius: 12,
                color: COLORS.textPrimary,
                fontSize: TYPOGRAPHY.bodyS,
                fontWeight: '600',
                borderWidth: 2,
                borderColor: COLORS.borderSecondary,
              }}
              placeholder={t('settings.namePlaceholder')}
              placeholderTextColor={COLORS.textSecondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          {/* Email Input */}
          <View style={{ marginBottom: DIMENSIONS.SPACING * 1.2 }}>
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.bodyXS,
                fontWeight: '700',
                color: COLORS.textPrimary,
                marginBottom: DIMENSIONS.SPACING * 0.4,
              }}
            >
              {t('settings.email')}
            </Text>
            <TextInput
              style={{
                width: '100%',
                padding: DIMENSIONS.SPACING * 0.9,
                backgroundColor: COLORS.cardBackgroundSecondary,
                borderRadius: 12,
                color: COLORS.textPrimary,
                fontSize: TYPOGRAPHY.bodyS,
                fontWeight: '600',
                borderWidth: 2,
                borderColor: COLORS.borderSecondary,
              }}
              placeholder={t('settings.emailPlaceholder')}
              placeholderTextColor={COLORS.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
            <TouchableOpacity
              onPress={onCancel}
              style={{
                flex: 1,
                paddingVertical: DIMENSIONS.SPACING * 0.7,
                borderRadius: 12,
                backgroundColor: COLORS.cardBackgroundSecondary,
                marginRight: DIMENSIONS.SPACING * 0.4,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: COLORS.borderSecondary,
              }}
            >
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyS,
                  fontWeight: '700',
                  color: COLORS.textPrimary,
                }}
              >
                {t('settings.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={{
                flex: 1,
                paddingVertical: DIMENSIONS.SPACING * 0.7,
                borderRadius: 12,
                backgroundColor: COLORS.textPrimary,
                marginLeft: DIMENSIONS.SPACING * 0.4,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyS,
                  fontWeight: '700',
                  color: COLORS.backgroundPrimary,
                }}
              >
                {t('common.save')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

