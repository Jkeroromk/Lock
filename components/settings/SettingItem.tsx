import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';
import CustomSwitch from './CustomSwitch';

interface SettingItemProps {
  icon: string;
  title: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  showSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  showChevron?: boolean;
}

export default function SettingItem({
  icon,
  title,
  description,
  value,
  onPress,
  showSwitch,
  switchValue,
  onSwitchChange,
  showChevron = true,
}: SettingItemProps) {
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <View 
          style={{ 
            width: DIMENSIONS.SCREEN_WIDTH * 0.1,
            height: DIMENSIONS.SCREEN_WIDTH * 0.1,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: DIMENSIONS.SPACING * 0.6,
            backgroundColor: COLORS.cardBackgroundSecondary,
            borderWidth: 1,
            borderColor: COLORS.borderSecondary,
          }}
        >
          <Ionicons name={icon as any} size={TYPOGRAPHY.iconXS} color={COLORS.textPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.bodyM,
              fontWeight: '700',
              color: COLORS.textPrimary,
              marginBottom: DIMENSIONS.SPACING * 0.1,
            }}
          >
            {title}
          </Text>
          {description && (
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.bodyXS,
                fontWeight: '500',
                color: COLORS.textPrimary,
                opacity: 0.7,
              }}
            >
              {description}
            </Text>
          )}
          {value && (
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.bodyXS,
                fontWeight: '500',
                color: COLORS.textPrimary,
                opacity: 0.7,
              }}
            >
              {value}
            </Text>
          )}
        </View>
      </View>
      {showSwitch ? (
        <CustomSwitch
          value={switchValue ?? false}
          onValueChange={onSwitchChange || (() => {})}
        />
      ) : showChevron && (
        <Ionicons name="chevron-forward" size={TYPOGRAPHY.iconXS} color={COLORS.textPrimary} opacity={0.7} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={{ 
          borderRadius: 16,
          padding: DIMENSIONS.SPACING,
          marginBottom: DIMENSIONS.SPACING,
          backgroundColor: COLORS.cardBackground,
          borderWidth: 2,
          borderColor: COLORS.borderPrimary,
        }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View 
      style={{ 
        borderRadius: 16,
        padding: DIMENSIONS.SPACING,
        marginBottom: DIMENSIONS.SPACING,
        backgroundColor: COLORS.cardBackground,
        borderWidth: 2,
        borderColor: COLORS.borderPrimary,
      }}
    >
      {content}
    </View>
  );
}

