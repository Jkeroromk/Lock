import { View, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { COLORS } from '@/constants';
import { LanguageCode, languageNames } from '@/i18n/locales';
import WheelPicker from './WheelPicker';

interface LanguageWheelPickerProps {
  languages: LanguageCode[];
  selectedValue: LanguageCode;
  onValueChange: (value: LanguageCode) => void;
  itemHeight?: number;
}

export default function LanguageWheelPicker({
  languages,
  selectedValue,
  onValueChange,
  itemHeight = 50,
}: LanguageWheelPickerProps) {
  const options = useMemo(
    () =>
      languages.map((langCode) => ({
        label: languageNames[langCode],
        value: langCode,
      })),
    [languages]
  );

  return (
    <View style={styles.container}>
      <WheelPicker
        options={options}
        value={selectedValue}
        onValueChange={onValueChange}
        infinite={false}
        visibleCount={7}
        optionItemHeight={itemHeight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
