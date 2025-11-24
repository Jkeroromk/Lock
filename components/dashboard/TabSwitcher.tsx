import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

interface TabSwitcherProps {
  activeTab: 'friends' | 'challenges';
  onTabChange: (tab: 'friends' | 'challenges') => void;
}

export default function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  const { t } = useTranslation();
  const colors = useTheme();

  return (
    <View 
      style={{ 
        flexDirection: 'row',
        borderRadius: 16,
        padding: DIMENSIONS.SPACING * 0.3,
        marginBottom: DIMENSIONS.SPACING * 1.2,
        backgroundColor: colors.cardBackground,
        borderWidth: 2,
        borderColor: colors.borderPrimary,
      }}
    >
      <TouchableOpacity
        onPress={() => onTabChange('friends')}
        style={{
          flex: 1,
          paddingVertical: DIMENSIONS.SPACING * 0.6,
          borderRadius: 12,
          backgroundColor: activeTab === 'friends' ? colors.textPrimary : 'transparent',
          alignItems: 'center',
        }}
      >
        <Text 
          style={{ 
            fontSize: TYPOGRAPHY.bodyM,
            fontWeight: '900',
            color: activeTab === 'friends' ? colors.backgroundPrimary : colors.textPrimary,
          }}
        >
          {t('dashboard.leaderboard')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onTabChange('challenges')}
        style={{
          flex: 1,
          paddingVertical: DIMENSIONS.SPACING * 0.6,
          borderRadius: 12,
          backgroundColor: activeTab === 'challenges' ? colors.textPrimary : 'transparent',
          alignItems: 'center',
        }}
      >
        <Text 
          style={{ 
            fontSize: TYPOGRAPHY.bodyM,
            fontWeight: '900',
            color: activeTab === 'challenges' ? colors.backgroundPrimary : colors.textPrimary,
          }}
        >
          {t('dashboard.challenges')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

