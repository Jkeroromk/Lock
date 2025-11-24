import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

interface User {
  name?: string;
  email?: string;
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
            width: DIMENSIONS.SCREEN_WIDTH * 0.16,
            height: DIMENSIONS.SCREEN_WIDTH * 0.16,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: DIMENSIONS.SPACING * 0.6,
            backgroundColor: colors.cardBackgroundSecondary,
            borderWidth: 2,
            borderColor: colors.borderSecondary,
          }}
        >
          <Ionicons name="person" size={TYPOGRAPHY.iconL} color={colors.textPrimary} />
        </View>
        <Text 
          style={{ 
            fontSize: TYPOGRAPHY.bodyL,
            fontWeight: '900',
            color: colors.textPrimary,
            marginBottom: DIMENSIONS.SPACING * 0.3,
          }}
        >
          {user?.name || t('settings.userName')}
        </Text>
        <Text 
          style={{ 
            fontSize: TYPOGRAPHY.bodyXS,
            fontWeight: '600',
            color: colors.textPrimary,
            opacity: 0.7,
          }}
        >
          {user?.email || 'user@example.com'}
        </Text>
      </View>
    </View>
  );
}

