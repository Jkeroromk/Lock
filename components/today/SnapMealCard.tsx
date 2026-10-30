import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { PressScale } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';

/**
 * Big yellow "snap this meal" card for the open iPhone Duo, where the camera
 * button in the tab bar is far from the content. Shows how much protein is
 * still to go, which is what the next meal should fix.
 */
export default function SnapMealCard({ proteinLeft }: { proteinLeft: number }) {
  const c = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const left = Math.round(proteinLeft);
  return (
    <PressScale
      onPress={() => router.push('/camera')}
      accessibilityRole="button"
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 76, paddingHorizontal: 16, paddingVertical: 12,
        borderRadius: 20, borderWidth: 2, borderColor: c.ink, backgroundColor: c.accent, marginBottom: 14,
        shadowColor: c.ink, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 },
      }}
    >
      <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] }}>
        <Ionicons name="camera-outline" size={24} color={c.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 19, fontWeight: '800', color: c.onAccent }}>{t('today.snapMeal')}</Text>
        <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: c.onAccent, marginTop: 2 }}>
          {left > 0 ? t('camera.proteinLeft', { g: String(left) }) : t('today.snapMealSub')}
        </Text>
      </View>
      <Ionicons name="arrow-forward" size={20} color={c.onAccent} />
    </PressScale>
  );
}
