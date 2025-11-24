import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';

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

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: DIMENSIONS.SPACING * 1, gap: DIMENSIONS.SPACING * 0.6 }}>
      {options.map((option) => (
        <TouchableOpacity
          key={`${option.value}-${selectedValue}`}
          onPress={() => onValueChange(option.value)}
          style={{
            paddingHorizontal: DIMENSIONS.SPACING * 1.2,
            paddingVertical: DIMENSIONS.SPACING * 0.6,
            borderRadius: 12,
            backgroundColor: selectedValue === option.value ? COLORS.textPrimary : COLORS.cardBackground,
            borderWidth: 2,
            borderColor: selectedValue === option.value ? COLORS.textPrimary : COLORS.borderPrimary,
          }}
        >
          <Text
            style={{
              fontSize: TYPOGRAPHY.bodyS,
              fontWeight: '700',
              color: selectedValue === option.value ? COLORS.backgroundPrimary : COLORS.textPrimary,
            }}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

