import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

const GENDER_LABELS: Record<string, string> = { male: '男', female: '女', other: '其他' };

interface User {
  name?: string;
  email?: string;
  username?: string;
  bio?: string;
  avatarEmoji?: string;
  avatarImage?: string;
  gender?: string;
  showGender?: boolean;
}

interface UserProfileCardProps {
  user: User | null;
  onEdit: () => void;
  themeMode: 'light' | 'dark';
  onThemeChange: (mode: 'light' | 'dark') => void;
}

export default function UserProfileCard({ user, onEdit, themeMode, onThemeChange }: UserProfileCardProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const isLightMode = themeMode === 'light';
  const nextTheme = isLightMode ? 'dark' : 'light';
  const themeIcon = isLightMode ? 'sunny' : 'moon';

  return (
    <View 
      style={{ 
        borderRadius: 20,
        padding: DIMENSIONS.SPACING * 1.2,
        marginBottom: DIMENSIONS.SPACING * 1.2,
        backgroundColor: colors.cardBackground,
        borderWidth: 2,
        borderColor: colors.borderPrimary,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 0.8 }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onThemeChange(nextTheme)}
          style={{
            width: DIMENSIONS.SCREEN_WIDTH * 0.08,
            height: DIMENSIONS.SCREEN_WIDTH * 0.08,
            borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.04,
            backgroundColor: colors.cardBackgroundSecondary,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.borderSecondary,
          }}
        >
          <Ionicons name={themeIcon as any} size={TYPOGRAPHY.iconXS} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onEdit}
          style={{
            width: DIMENSIONS.SCREEN_WIDTH * 0.08,
            height: DIMENSIONS.SCREEN_WIDTH * 0.08,
            borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.04,
            backgroundColor: colors.cardBackgroundSecondary,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.borderSecondary,
          }}
        >
          <Ionicons name="pencil-outline" size={TYPOGRAPHY.iconXS} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: DIMENSIONS.SCREEN_WIDTH * 0.18,
            height: DIMENSIONS.SCREEN_WIDTH * 0.18,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: DIMENSIONS.SPACING * 0.6,
            backgroundColor: colors.cardBackgroundSecondary,
            borderWidth: 2,
            borderColor: colors.borderSecondary,
          }}
        >
          {user?.avatarImage ? (
            <Image source={{ uri: user.avatarImage }} style={{ width: '100%', height: '100%', borderRadius: 18 }} />
          ) : user?.avatarEmoji ? (
            <Text style={{ fontSize: DIMENSIONS.SCREEN_WIDTH * 0.09 }}>{user.avatarEmoji}</Text>
          ) : (
            <Ionicons name="person" size={TYPOGRAPHY.iconL} color={colors.textPrimary} />
          )}
        </View>
        <Text
          style={{
            fontSize: TYPOGRAPHY.bodyL,
            fontWeight: '900',
            color: colors.textPrimary,
            marginBottom: DIMENSIONS.SPACING * 0.15,
          }}
        >
          {user?.username ? `@${user.username}` : user?.name || t('settings.userName')}
        </Text>
        {user?.bio && (
          <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '500', color: colors.textPrimary, opacity: 0.7, textAlign: 'center', marginTop: DIMENSIONS.SPACING * 0.2 }}>
            {user.bio}
          </Text>
        )}
        {user?.showGender && user?.gender && (
          <View style={{ marginTop: DIMENSIONS.SPACING * 0.4, paddingHorizontal: DIMENSIONS.SPACING * 0.6, paddingVertical: 2, borderRadius: 10, backgroundColor: colors.cardBackgroundSecondary, borderWidth: 1, borderColor: colors.borderPrimary }}>
            <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary }}>
              {GENDER_LABELS[user.gender] || user.gender}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

