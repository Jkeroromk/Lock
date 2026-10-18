import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { PressScale, STROKE } from '@/components/ui/bxc';
import { PetSprite } from '@/components/pet/PetSprite';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { BUDDY_KINDS, buddyImage, type BuddyKind } from '@/constants/pets';

/** Three stacked cards to choose a buddy species (baby art). */
export default function KindPicker({ value, onChange }: { value: BuddyKind; onChange: (k: BuddyKind) => void }) {
  const c = useTheme();
  const { t } = useTranslation();
  return (
    <View style={{ gap: 10 }}>
      {BUDDY_KINDS.map((k) => {
        const on = k === value;
        return (
          <PressScale
            key={k}
            onPress={() => onChange(k)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t(`pet.kind.${k}`)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 12,
              borderRadius: 20, borderWidth: on ? 3 : STROKE.card, borderColor: on ? c.ink : c.borderPrimary,
              backgroundColor: on ? c.accent : c.cardBackground,
            }}
          >
            <PetSprite source={buddyImage(k, 1)} size={72} still={!on} shadow={false} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: on ? c.onAccent : c.textPrimary }}>{t(`pet.kind.${k}`)}</Text>
              <Text style={{ fontSize: 13, color: on ? c.onAccent : c.textSecondary }}>{t(`pet.kindDesc.${k}`)}</Text>
            </View>
            {on ? (
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="checkmark" size={17} color={c.accent} />
              </View>
            ) : null}
          </PressScale>
        );
      })}
    </View>
  );
}
