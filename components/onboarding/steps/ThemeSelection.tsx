import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { ThemeMode } from '@/store/useStore';

interface ThemeSelectionProps {
  themeMode: ThemeMode | null;
  setThemeMode: (mode: ThemeMode) => void;
}

export default function ThemeSelection({ themeMode, setThemeMode }: ThemeSelectionProps) {
  const { t } = useTranslation();
  const colors = useTheme();

  const themes = [
    {
      mode: 'light' as ThemeMode,
      icon: 'sunny',
      title: t('onboarding.theme.light'),
      description: t('onboarding.theme.lightDescription'),
    },
    {
      mode: 'dark' as ThemeMode,
      icon: 'moon',
      title: t('onboarding.theme.dark'),
      description: t('onboarding.theme.darkDescription'),
    },
    {
      mode: 'auto' as ThemeMode,
      icon: 'phone-portrait',
      title: t('onboarding.theme.auto'),
      description: t('onboarding.theme.autoDescription'),
    },
  ];

  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <View style={{ marginBottom: DIMENSIONS.SPACING * 1.5 }}>
        <Text
          style={{
            fontSize: TYPOGRAPHY.titleL,
            fontWeight: '900',
            color: colors.textPrimary,
            textAlign: 'center',
            marginBottom: DIMENSIONS.SPACING * 0.6,
          }}
        >
          {t('onboarding.themeTitle')}
        </Text>
        <Text
          style={{
            fontSize: TYPOGRAPHY.bodyM,
            fontWeight: '500',
            color: colors.textPrimary,
            textAlign: 'center',
            opacity: 0.7,
          }}
        >
          {t('onboarding.themeDescription')}
        </Text>
      </View>

      <View style={{ width: '100%', gap: DIMENSIONS.SPACING * 0.8 }}>
        {themes.map((theme) => {
          const isSelected = themeMode === theme.mode;
          return (
            <TouchableOpacity
              key={theme.mode}
              onPress={() => setThemeMode(theme.mode)}
              activeOpacity={0.8}
              style={{
                borderRadius: 20,
                padding: DIMENSIONS.SPACING * 1.2,
                backgroundColor: isSelected ? colors.textPrimary : colors.cardBackground,
                borderWidth: 2,
                borderColor: isSelected ? colors.textPrimary : colors.borderPrimary,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: DIMENSIONS.SCREEN_WIDTH * 0.12,
                  height: DIMENSIONS.SCREEN_WIDTH * 0.12,
                  borderRadius: 16,
                  backgroundColor: isSelected ? colors.backgroundPrimary : colors.cardBackgroundSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: DIMENSIONS.SPACING * 0.8,
                }}
              >
                <Ionicons
                  name={theme.icon as any}
                  size={TYPOGRAPHY.iconL}
                  color={isSelected ? colors.textPrimary : colors.textPrimary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: TYPOGRAPHY.bodyL,
                    fontWeight: '900',
                    color: isSelected ? colors.backgroundPrimary : colors.textPrimary,
                    marginBottom: DIMENSIONS.SPACING * 0.2,
                  }}
                >
                  {theme.title}
                </Text>
                <Text
                  style={{
                    fontSize: TYPOGRAPHY.bodyXS,
                    fontWeight: '500',
                    color: isSelected ? colors.backgroundPrimary : colors.textPrimary,
                    opacity: 0.7,
                  }}
                >
                  {theme.description}
                </Text>
              </View>
              {isSelected && (
                <Ionicons
                  name="checkmark-circle"
                  size={TYPOGRAPHY.iconM}
                  color={colors.backgroundPrimary}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

