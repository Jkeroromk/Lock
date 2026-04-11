import {
  View, Text, Modal, TextInput, TouchableOpacity, Image,
  Alert, Platform, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { updateProfile } from '@/services/api';


const AVATAR_OPTIONS = [
  '🏃','🧘','💪','🔥','😎','🚀',
];

interface User {
  name?: string;
  username?: string;
  bio?: string;
  avatarEmoji?: string;
  avatarImage?: string;
  gender?: string;
  showGender?: boolean;
}

interface EditProfileModalProps {
  visible: boolean;
  user: User | null;
  onSave: (updated: { name: string; username?: string; bio?: string; avatarEmoji?: string; avatarImage?: string; showGender?: boolean }) => void;
  onCancel: () => void;
}

export default function EditProfileModal({ visible, user, onSave, onCancel }: EditProfileModalProps) {
  const { t } = useTranslation();
  const colors = useTheme();

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('🏃');
  const [avatarImage, setAvatarImage] = useState<string | undefined>(undefined);
  const [showGender, setShowGender] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && user) {
      setUsername(user.username || user.name || '');
      setBio(user.bio || '');
      setAvatarEmoji(user.avatarEmoji || '🏃');
      setAvatarImage(user.avatarImage);
      setShowGender(user.showGender ?? false);
    }
  }, [visible, user]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('log.needPermission'), t('settings.privacyControls'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarImage(result.assets[0].uri);
      setAvatarEmoji('');
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('', t('settings.nameRequired'));
      return;
    }
    setSaving(true);
    const uname = username.trim();
    try {
      await updateProfile({
        name: uname,
        username: uname,
        bio: bio.trim() || undefined,
        avatarEmoji: avatarImage ? undefined : avatarEmoji,
        showGender,
      } as any);
      onSave({ name: uname, username: uname, bio: bio.trim() || undefined, avatarEmoji: avatarImage ? undefined : avatarEmoji, avatarImage, showGender });
    } catch (err: any) {
      Alert.alert(t('weightTracker.saveFailed'), err?.response?.data?.error || err?.message || t('common.retry'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{
            backgroundColor: colors.backgroundPrimary,
            borderTopLeftRadius: 32, borderTopRightRadius: 32,
            maxHeight: '92%',
            borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2,
            borderColor: colors.borderPrimary,
          }}>
            {/* Handle */}
            <View style={{ alignItems: 'center', paddingTop: DIMENSIONS.SPACING * 0.8 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderPrimary }} />
            </View>

            {/* Header */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingVertical: DIMENSIONS.SPACING,
            }}>
              <Text style={{ fontSize: TYPOGRAPHY.title, fontWeight: '900', color: colors.textPrimary }}>
                {t('settings.editProfile')}
              </Text>
              <TouchableOpacity onPress={onCancel} style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: colors.cardBackgroundSecondary,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: colors.borderPrimary,
              }}>
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingBottom: 40 }}
            >
              {/* Avatar picker */}
              <View style={{ alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 1.5 }}>
                <View style={{
                  width: 80, height: 80, borderRadius: 24,
                  backgroundColor: colors.cardBackground,
                  borderWidth: 2, borderColor: colors.borderPrimary,
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: DIMENSIONS.SPACING * 0.8,
                  overflow: 'hidden',
                }}>
                  {avatarImage ? (
                    <Image source={{ uri: avatarImage }} style={{ width: 80, height: 80 }} />
                  ) : (
                    <Text style={{ fontSize: 40 }}>{avatarEmoji || '🏃'}</Text>
                  )}
                </View>
                {/* Upload button */}
                <TouchableOpacity onPress={handlePickImage} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: DIMENSIONS.SPACING * 0.9, paddingVertical: DIMENSIONS.SPACING * 0.4,
                  borderRadius: 20, borderWidth: 1.5, borderColor: colors.borderPrimary,
                  backgroundColor: colors.cardBackground, marginBottom: DIMENSIONS.SPACING * 0.8,
                }}>
                  <Ionicons name="image-outline" size={14} color={colors.textPrimary} />
                  <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textPrimary }}>{t('settings.changeAvatar')}</Text>
                </TouchableOpacity>
                <Text style={{
                  fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700',
                  color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1,
                  marginBottom: DIMENSIONS.SPACING * 0.5,
                }}>
                  Emoji
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, paddingHorizontal: DIMENSIONS.SPACING * 1.5 }}>
                  {AVATAR_OPTIONS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => { setAvatarEmoji(emoji); setAvatarImage(undefined); }}
                      style={{
                        width: 40, height: 40, borderRadius: 10,
                        backgroundColor: !avatarImage && avatarEmoji === emoji ? colors.textPrimary : colors.cardBackground,
                        borderWidth: 2,
                        borderColor: !avatarImage && avatarEmoji === emoji ? colors.textPrimary : colors.borderPrimary,
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Username */}
              <View style={{ marginBottom: DIMENSIONS.SPACING * 1 }}>
                <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: DIMENSIONS.SPACING * 0.4 }}>
                  {t('settings.userName')}
                </Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: colors.cardBackground, borderRadius: 14,
                  borderWidth: 2, borderColor: colors.borderPrimary,
                  paddingHorizontal: DIMENSIONS.SPACING * 0.9,
                }}>
                  <Text style={{ fontSize: TYPOGRAPHY.bodyM, color: colors.textSecondary, fontWeight: '600' }}>@</Text>
                  <TextInput
                    style={{
                      flex: 1, padding: DIMENSIONS.SPACING * 0.9,
                      color: colors.textPrimary, fontSize: TYPOGRAPHY.bodyM, fontWeight: '600',
                    }}
                    placeholder="username"
                    placeholderTextColor={colors.textSecondary}
                    value={username}
                    onChangeText={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary, marginTop: 4, marginLeft: 2 }}>
                  {t('settings.usernameHint' as any)}
                </Text>
              </View>

              {/* Bio */}
              <View style={{ marginBottom: DIMENSIONS.SPACING * 1.5 }}>
                <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: DIMENSIONS.SPACING * 0.4 }}>
                  {t('settings.profileInfo')}
                </Text>
                <TextInput
                  style={{
                    padding: DIMENSIONS.SPACING * 0.9, backgroundColor: colors.cardBackground,
                    borderRadius: 14, color: colors.textPrimary, fontSize: TYPOGRAPHY.bodyS,
                    fontWeight: '500', borderWidth: 2, borderColor: colors.borderPrimary,
                    height: 90, textAlignVertical: 'top',
                  }}
                  placeholder="..."
                  placeholderTextColor={colors.textSecondary}
                  value={bio}
                  onChangeText={(v) => v.length <= 100 && setBio(v)}
                  multiline
                  maxLength={100}
                />
                <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary, marginTop: 4, textAlign: 'right' }}>
                  {bio.length}/100
                </Text>
              </View>

              {/* Gender visibility */}
              {user?.gender && (
                <TouchableOpacity
                  onPress={() => setShowGender((v) => !v)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: DIMENSIONS.SPACING * 0.9, paddingVertical: DIMENSIONS.SPACING * 0.7,
                    backgroundColor: colors.cardBackground, borderRadius: 14,
                    borderWidth: 2, borderColor: colors.borderPrimary,
                    marginBottom: DIMENSIONS.SPACING * 1.5,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name={showGender ? 'eye' : 'eye-off'} size={16} color={colors.textPrimary} />
                    <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.textPrimary }}>
                      {t('settings.gender')}
                    </Text>
                    {showGender && (
                      <Text style={{ fontSize: TYPOGRAPHY.bodyXS, color: colors.textSecondary, fontWeight: '600' }}>
                        ({t(`settings.genderOptions.${user.gender}` as any) || user.gender})
                      </Text>
                    )}
                  </View>
                  <View style={{
                    width: 40, height: 22, borderRadius: 11,
                    backgroundColor: showGender ? colors.textPrimary : colors.cardBackgroundSecondary,
                    borderWidth: 1.5, borderColor: colors.borderPrimary,
                    justifyContent: 'center', paddingHorizontal: 2,
                  }}>
                    <View style={{
                      width: 16, height: 16, borderRadius: 8,
                      backgroundColor: showGender ? colors.backgroundPrimary : colors.textSecondary,
                      alignSelf: showGender ? 'flex-end' : 'flex-start',
                    }} />
                  </View>
                </TouchableOpacity>
              )}

              {/* Buttons */}
              <View style={{ flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.6 }}>
                <TouchableOpacity
                  onPress={onCancel}
                  style={{
                    flex: 1, paddingVertical: DIMENSIONS.SPACING * 0.9, borderRadius: 14,
                    alignItems: 'center', backgroundColor: colors.cardBackground,
                    borderWidth: 2, borderColor: colors.borderPrimary,
                  }}
                >
                  <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.textPrimary }}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1, paddingVertical: DIMENSIONS.SPACING * 0.9, borderRadius: 14,
                    alignItems: 'center', backgroundColor: colors.textPrimary,
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.backgroundPrimary }}>
                    {t('common.save')}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
