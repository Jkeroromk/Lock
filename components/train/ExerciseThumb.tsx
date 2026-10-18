import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { getExercise } from '@/constants/exercises';

/**
 * Square tile standing in for an exercise picture: the muscle group in big
 * type. (Animated demos come later.)
 */
export default function ExerciseThumb({ id, size = 44, highlight }: { id: string; size?: number; highlight?: boolean }) {
  const c = useTheme();
  const { t } = useTranslation();
  const group = getExercise(id)?.group;
  const label = group ? t(`train.group.${group}`) : '?';
  // CJK labels are one or two characters; Latin ones get the first three letters.
  const short = /^[\x00-\x7F]+$/.test(label) ? label.slice(0, 3).toUpperCase() : label.slice(0, 2);
  return (
    <View
      style={{
        width: size, height: size, borderRadius: Math.round(size * 0.28),
        borderWidth: 2, borderColor: c.borderPrimary,
        backgroundColor: highlight ? c.accent : c.cardBackgroundSecondary,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text style={{ fontWeight: '800', fontSize: size * (short.length > 2 ? 0.26 : 0.36), letterSpacing: -0.5, color: highlight ? c.onAccent : c.textPrimary }}>
        {short}
      </Text>
    </View>
  );
}
