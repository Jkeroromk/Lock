import { View, TouchableOpacity, Image, Alert } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { Card, IconButton, Label } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';


interface User {
  name?: string;
  email?: string;
  username?: string;
  bio?: string;
  avatarEmoji?: string;
  avatarImage?: string;
  gender?: string;
  showGender?: boolean;
  inviteCode?: string;
}

interface UserProfileCardProps {
  user: User | null;
  onEdit: () => void;
}

export default function UserProfileCard({ user, onEdit }: UserProfileCardProps) {
  const { t } = useTranslation();
  const colors = useTheme();

  const handleCopyInviteCode = async () => {
    if (!user?.inviteCode) return;
    await Clipboard.setStringAsync(user.inviteCode);
    Alert.alert(t('settings.success'), t('settings.inviteCodeCopied' as any));
  };

  const displayName = user?.username ? `@${user.username}` : user?.name || t('settings.userName');

  return (
    <Card variant="hero" padding={16} style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{
          width: 72, height: 72, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
          backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.ink, transform: [{ rotate: '-3deg' }],
        }}>
          {user?.avatarImage ? (
            <Image source={{ uri: user.avatarImage }} style={{ width: 72, height: 72 }} accessibilityIgnoresInvertColors />
          ) : user?.avatarEmoji ? (
            <Text style={{ fontSize: 34 }}>{user.avatarEmoji}</Text>
          ) : (
            <Text style={{ fontSize: 30, fontWeight: '800', color: colors.onAccent }}>{(user?.name || '?').trim().charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.6, color: colors.textPrimary }}>{displayName}</Text>
          {user?.bio ? (
            <Text numberOfLines={2} style={{ fontSize: 14, lineHeight: 19, color: colors.textSecondary, marginTop: 2 }}>{user.bio}</Text>
          ) : null}
          {user?.showGender && user?.gender ? (
            <Label style={{ fontSize: 10, marginTop: 4 }}>{t(`settings.genderOptions.${user.gender}` as any) || user.gender}</Label>
          ) : null}
        </View>
        <IconButton icon="pencil-outline" onPress={onEdit} accessibilityLabel={t('settings.editProfile' as any)} />
      </View>

      {user?.inviteCode ? (
        <View style={{ marginTop: 16, borderTopWidth: 1.5, borderTopColor: colors.divider, paddingTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label>{t('settings.inviteCode' as any)}</Label>
            <TouchableOpacity
              onPress={handleCopyInviteCode}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${t('settings.inviteCode' as any)} ${user.inviteCode}`}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 14,
                borderRadius: 13, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.ink,
              }}
            >
              <Text style={{ fontFamily: FONTS.mono, fontWeight: '600', fontSize: 17, letterSpacing: 3, color: colors.onAccent }}>{user.inviteCode}</Text>
              <Ionicons name="copy-outline" size={16} color={colors.onAccent} />
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 13, lineHeight: 18, color: colors.textSecondary, marginTop: 8 }}>{t('settings.inviteCodeDesc' as any)}</Text>
        </View>
      ) : null}
    </Card>
  );
}
