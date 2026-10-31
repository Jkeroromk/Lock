import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '@/constants/fonts';
import { useTheme } from '@/hooks/useTheme';
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
  /** Highlighted: the page open beside the list (open iPhone Duo). */
  selected?: boolean;
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
  selected,
}: SettingItemProps) {
  const colors = useTheme();
  const fg = selected ? colors.onAccent : colors.textPrimary;
  const fg2 = selected ? colors.onAccent : colors.textSecondary;
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{
        width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: selected ? colors.onAccent : colors.borderPrimary,
      }}>
        <Ionicons name={icon as any} size={19} color={fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: fg }}>{title}</Text>
        {description ? (
          <Text style={{ fontSize: 13, lineHeight: 18, color: fg2, marginTop: 1 }}>{description}</Text>
        ) : null}
      </View>
      {value ? (
        <Text numberOfLines={1} style={{ fontFamily: FONTS.mono, fontSize: 12, color: colors.textSecondary, maxWidth: 130, textTransform: 'uppercase' }}>
          {value}
        </Text>
      ) : null}
      {showSwitch ? (
        <CustomSwitch value={switchValue ?? false} onValueChange={onSwitchChange || (() => {})} accessibilityLabel={title} />
      ) : showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={fg2} />
      ) : null}
    </View>
  );

  const box = {
    borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, minHeight: 64,
    justifyContent: 'center' as const,
    backgroundColor: selected ? colors.accent : colors.cardBackground, borderWidth: 2, borderColor: selected ? colors.ink : colors.borderPrimary,
  };

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} accessibilityRole="button" accessibilityState={selected ? { selected: true } : undefined} accessibilityLabel={value ? `${title}, ${value}` : title} style={box}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={box}>{content}</View>;
}
