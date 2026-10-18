import { View, Image, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';

/**
 * A person's avatar: their photo, or the first letter of their name. The
 * status emoji sits on the corner as a small badge instead of replacing the
 * picture.
 */
export default function UserAvatar({ image, name, initial, status, size = 40, radius, background, color, ring, style }: {
  image?: string | null;
  /** Used for the letter when there's no photo. */
  name?: string | null;
  /** Ready-made letter (the social APIs send one); wins over `name`. */
  initial?: string | null;
  status?: string | null;
  size?: number;
  /** Corner radius; defaults to a circle. */
  radius?: number;
  background?: string;
  color?: string;
  /** Stroke around the picture. */
  ring?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const letter = (initial || (name || '?').trim().charAt(0) || '?').toUpperCase();
  const r = radius ?? size / 2;
  const badge = Math.max(16, Math.round(size * 0.42));
  return (
    <View style={[{ width: size, height: size }, style]}>
      <View style={{
        width: size, height: size, borderRadius: r, overflow: 'hidden',
        backgroundColor: background ?? c.cardBackgroundSecondary,
        borderWidth: ring ? 2 : 0, borderColor: ring,
        alignItems: 'center', justifyContent: 'center',
      }}>
        {image ? (
          <Image source={{ uri: image }} style={{ width: size, height: size }} accessibilityIgnoresInvertColors />
        ) : (
          <Text style={{ fontSize: size * 0.42, fontWeight: '800', color: color ?? c.textPrimary }}>{letter}</Text>
        )}
      </View>
      {status ? (
        <View
          accessibilityLabel={status}
          style={{
            position: 'absolute', right: -Math.round(badge * 0.25), bottom: -Math.round(badge * 0.2),
            width: badge, height: badge, borderRadius: badge / 2,
            backgroundColor: c.cardBackground, borderWidth: 1.5, borderColor: c.borderPrimary,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: badge * 0.58, lineHeight: badge * 0.8 }}>{status}</Text>
        </View>
      ) : null}
    </View>
  );
}
