import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/bxc';
import StepHeader from '@/components/onboarding/StepHeader';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { ACQUISITION_ICONS, ACQUISITION_SOURCES, type AcquisitionSource } from '@/constants/acquisition';

/** "How did you hear about Kero Lock?" One tap; "Other" can say where. */
export default function SourceSelection({ source, setSource, detail, setDetail }: {
  source: AcquisitionSource | null;
  setSource: (v: AcquisitionSource) => void;
  detail: string;
  setDetail: (v: string) => void;
}) {
  const c = useTheme();
  const { t } = useTranslation();

  return (
    <View style={{ width: '100%' }}>
      <StepHeader titleKey="onboarding.sourceTitle" descriptionKey="onboarding.sourceDescription" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
        {ACQUISITION_SOURCES.map((s) => {
          const selected = source === s;
          return (
            <Pressable
              key={s}
              onPress={() => setSource(s)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={({ pressed }) => ({
                flexBasis: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
                minHeight: 48, paddingHorizontal: 12, borderRadius: 13, borderWidth: 2,
                borderColor: selected ? c.textPrimary : c.borderPrimary,
                backgroundColor: selected ? c.textPrimary : 'transparent',
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Ionicons name={ACQUISITION_ICONS[s] as any} size={17} color={selected ? c.backgroundPrimary : c.textSecondary} />
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ flex: 1, fontSize: 15, fontWeight: '700', color: selected ? c.backgroundPrimary : c.textPrimary }}>
                {t(`onboarding.source.${s}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {source === 'other' ? (
        <TextField
          value={detail}
          onChangeText={setDetail}
          placeholder={t('onboarding.sourceOtherPlaceholder')}
          maxLength={60}
          returnKeyType="done"
          containerStyle={{ marginTop: 12 }}
        />
      ) : null}
    </View>
  );
}
