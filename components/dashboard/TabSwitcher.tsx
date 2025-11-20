import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';

interface TabSwitcherProps {
  activeTab: 'friends' | 'challenges';
  onTabChange: (tab: 'friends' | 'challenges') => void;
}

export default function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  const { t } = useTranslation();

  return (
    <View 
      style={{ 
        flexDirection: 'row',
        borderRadius: 16,
        padding: DIMENSIONS.SPACING * 0.3,
        marginBottom: DIMENSIONS.SPACING * 1.2,
        backgroundColor: COLORS.cardBackground,
        borderWidth: 2,
        borderColor: COLORS.borderPrimary,
      }}
    >
      <TouchableOpacity
        onPress={() => onTabChange('friends')}
        style={{
          flex: 1,
          paddingVertical: DIMENSIONS.SPACING * 0.6,
          borderRadius: 12,
          backgroundColor: activeTab === 'friends' ? COLORS.textPrimary : 'transparent',
          alignItems: 'center',
        }}
      >
        <Text 
          style={{ 
            fontSize: TYPOGRAPHY.bodyM,
            fontWeight: '900',
            color: activeTab === 'friends' ? COLORS.backgroundPrimary : COLORS.textPrimary,
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
          backgroundColor: activeTab === 'challenges' ? COLORS.textPrimary : 'transparent',
          alignItems: 'center',
        }}
      >
        <Text 
          style={{ 
            fontSize: TYPOGRAPHY.bodyM,
            fontWeight: '900',
            color: activeTab === 'challenges' ? COLORS.backgroundPrimary : COLORS.textPrimary,
          }}
        >
          {t('dashboard.challenges')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

