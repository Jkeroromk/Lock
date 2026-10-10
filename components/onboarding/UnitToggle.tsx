import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { FONTS } from '@/constants/fonts';

interface UnitToggleProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  selectedValue: T;
  onValueChange: (value: T) => void;
}

export default function UnitToggle<T extends string>({
  options,
  selectedValue,
  onValueChange,
}: UnitToggleProps<T>) {
  const { t } = useTranslation();
  const colors = useTheme();

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: DIMENSIONS.SPACING * 1, gap: DIMENSIONS.SPACING * 0.6 }}>
      {options.map((option) => (
        <TouchableOpacity
          key={`${option.value}-${selectedValue}`}
          onPress={() => onValueChange(option.value)}
          style={{
            minWidth: 72,
            minHeight: 44,
            paddingHorizontal: 16,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 13,
            backgroundColor: selectedValue === option.value ? colors.textPrimary : colors.cardBackground,
            borderWidth: 2,
            borderColor: selectedValue === option.value ? colors.textPrimary : colors.borderPrimary,
          }}
        >
          <Text
            style={{
              fontFamily: FONTS.mono,
              fontSize: 13,
              fontWeight: '600',
              textTransform: 'uppercase',
              color: selectedValue === option.value ? colors.backgroundPrimary : colors.textPrimary,
            }}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

