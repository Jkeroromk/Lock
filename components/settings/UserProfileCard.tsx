import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';

interface User {
  name?: string;
  email?: string;
}

interface UserProfileCardProps {
  user: User | null;
  onEdit: () => void;
}

export default function UserProfileCard({ user, onEdit }: UserProfileCardProps) {
  const { t } = useTranslation();

  return (
    <View 
      style={{ 
        borderRadius: 20,
        padding: DIMENSIONS.SPACING * 1.2,
        marginBottom: DIMENSIONS.SPACING * 1.2,
        backgroundColor: COLORS.cardBackground,
        borderWidth: 2,
        borderColor: COLORS.borderPrimary,
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
        position: 'relative',
      }}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onEdit}
        style={{
          position: 'absolute',
          top: DIMENSIONS.SPACING * 0.4,
          right: DIMENSIONS.SPACING * 0.4,
          width: DIMENSIONS.SCREEN_WIDTH * 0.08,
          height: DIMENSIONS.SCREEN_WIDTH * 0.08,
          borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.04,
          backgroundColor: COLORS.cardBackgroundSecondary,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: COLORS.borderSecondary,
        }}
      >
        <Ionicons name="create-outline" size={TYPOGRAPHY.iconXXS} color={COLORS.textPrimary} />
      </TouchableOpacity>
      <View style={{ alignItems: 'center' }}>
        <View 
          style={{ 
            width: DIMENSIONS.SCREEN_WIDTH * 0.16,
            height: DIMENSIONS.SCREEN_WIDTH * 0.16,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: DIMENSIONS.SPACING * 0.6,
            backgroundColor: COLORS.cardBackgroundSecondary,
            borderWidth: 2,
            borderColor: COLORS.borderSecondary,
          }}
        >
          <Ionicons name="person" size={TYPOGRAPHY.iconL} color={COLORS.textPrimary} />
        </View>
        <Text 
          style={{ 
            fontSize: TYPOGRAPHY.bodyL,
            fontWeight: '900',
            color: COLORS.textPrimary,
            marginBottom: DIMENSIONS.SPACING * 0.3,
          }}
        >
          {user?.name || t('settings.userName')}
        </Text>
        <Text 
          style={{ 
            fontSize: TYPOGRAPHY.bodyXS,
            fontWeight: '600',
            color: COLORS.textPrimary,
            opacity: 0.7,
          }}
        >
          {user?.email || 'user@example.com'}
        </Text>
      </View>
    </View>
  );
}

