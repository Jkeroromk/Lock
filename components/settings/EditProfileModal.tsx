import {
  View, Modal, TouchableOpacity, Image, Alert, Platform, ScrollView, Keyboard, LayoutAnimation, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '@/components/ui/Text';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { updateProfile } from '@/services/api';
import { toCompressedBase64 } from '@/lib/image';


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

  // Keyboard: on iOS the sheet rises by the keyboard's height (Android's modal
  // window already resizes), and the focused field scrolls into view.
  const { height: windowH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [kb, setKb] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const fieldY = useRef<{ username: number; bio: number }>({ username: 0, bio: 0 });
  const focused = useRef<'username' | 'bio' | null>(null);

  const scrollToField = (field: 'username' | 'bio') => {
    focused.current = field;
    setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, fieldY.current[field] - 12), animated: true }), 80);
  };

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const show = Keyboard.addListener('keyboardWillShow', (e) => {
      LayoutAnimation.configureNext(LayoutAnimation.create(e.duration || 250, 'keyboard', 'opacity'));
      setKb(e.endCoordinates.height);
    });
    const shown = Keyboard.addListener('keyboardDidShow', () => {
      if (focused.current) scrollToField(focused.current);
    });
    const hide = Keyboard.addListener('keyboardWillHide', (e) => {
      LayoutAnimation.configureNext(LayoutAnimation.create(e.duration || 250, 'keyboard', 'opacity'));
      setKb(0);
      focused.current = null;
    });
    return () => { show.remove(); shown.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (visible && user) {
      const rawName = user.username || user.name || '';
      setUsername(rawName.toLowerCase().replace(/[^a-z0-9_]/g, ''));
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
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0]) {
      const src = result.assets[0].uri;
      // Stored in the database and sent with every leaderboard / moments
      // response, so keep it small: 256px is plenty for an avatar.
      const base64 = await toCompressedBase64(src, { maxWidth: 256, quality: 0.7 });
      const dataUri = `data:image/jpeg;base64,${base64}`;
      setAvatarImage(dataUri);
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
        avatarImage: avatarImage || null,
        showGender,
      } as any);
      onSave({ name: uname, username: uname, bio: bio.trim() || undefined, avatarEmoji: avatarImage ? undefined : avatarEmoji, avatarImage: avatarImage || undefined, showGender });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || t('common.retry');
      Alert.alert(t('weightTracker.saveFailed'), msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)', paddingBottom: kb }}>
          <View style={{
            backgroundColor: colors.backgroundPrimary,
            borderTopLeftRadius: 32, borderTopRightRadius: 32,
            maxHeight: windowH - kb - insets.top - 12,
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
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              contentContainerStyle={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingBottom: kb ? 16 : Math.max(40, insets.bottom + 16) }}
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
              <View style={{ marginBottom: DIMENSIONS.SPACING * 1 }} onLayout={(e) => { fieldY.current.username = e.nativeEvent.layout.y; }}>
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
                    onFocus={() => scrollToField('username')}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                </View>
                <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary, marginTop: 4, marginLeft: 2 }}>
                  {t('settings.usernameHint' as any)}
                </Text>
              </View>

              {/* Bio */}
              <View style={{ marginBottom: DIMENSIONS.SPACING * 1.5 }} onLayout={(e) => { fieldY.current.bio = e.nativeEvent.layout.y; }}>
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
                  onFocus={() => scrollToField('bio')}
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
      </View>
    </Modal>
  );
}
