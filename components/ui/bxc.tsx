/**
 * Lock "B×C" design primitives. Build screens from these so the look stays
 * consistent: Card (default / hero / inverse), Ring, Bar, Chip, Sticker, Label.
 */
import { ReactNode } from 'react';
import { View, TouchableOpacity, type ViewStyle, type StyleProp, type TouchableOpacityProps } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { FONTS } from '@/constants/fonts';
import { useTheme } from '@/hooks/useTheme';

export const RADIUS = { card: 22, hero: 24, control: 13, cell: 6 } as const;
export const STROKE = { card: 2, control: 2, bar: 1.5 } as const;
export const SHADOW_OFFSET = 5;

// ── HardShadow ─────────────────────────────────────────────────────────────
/**
 * Solid, offset "sticker" shadow. Drawn as a View behind the content so it
 * looks identical on iOS and Android (Android elevation can't do this).
 * Reserves `offset` px on the right and bottom so the shadow isn't clipped.
 */
export function HardShadow({ children, color, radius, offset = SHADOW_OFFSET, style }: {
  children: ReactNode;
  color: string;
  radius: number;
  offset?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ marginRight: offset, marginBottom: offset }, style]}>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: offset, left: offset, right: -offset, bottom: -offset, borderRadius: radius, backgroundColor: color }}
      />
      {children}
    </View>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────
type CardVariant = 'default' | 'hero' | 'inverse';

export function Card({ children, variant = 'default', style, padding = 16 }: {
  children: ReactNode;
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
  padding?: number;
}) {
  const c = useTheme();
  if (variant === 'inverse') {
    return (
      <View style={[{ backgroundColor: c.surfaceInverse, borderRadius: RADIUS.card, padding }, style]}>
        {children}
      </View>
    );
  }
  const body = (
    <View
      style={[
        {
          backgroundColor: c.cardBackground,
          borderRadius: variant === 'hero' ? RADIUS.hero : RADIUS.card,
          borderWidth: STROKE.card,
          borderColor: variant === 'hero' ? c.borderStrong : c.borderPrimary,
          padding,
        },
        variant === 'hero' ? null : style,
      ]}
    >
      {children}
    </View>
  );
  if (variant !== 'hero') return body;
  return (
    <HardShadow color={c.cardShadow} radius={RADIUS.hero} style={style}>
      {body}
    </HardShadow>
  );
}

// ── Label ──────────────────────────────────────────────────────────────────
/** Small uppercase mono label ("PROTEIN", "STEPS"). */
export function Label({ children, color, style }: { children: ReactNode; color?: string; style?: any }) {
  const c = useTheme();
  return (
    <Text style={[{ fontFamily: FONTS.mono, fontWeight: '500', fontSize: 11, letterSpacing: 0.6, color: color ?? c.textSecondary, textTransform: 'uppercase' }, style]}>
      {children}
    </Text>
  );
}

// ── Ring ───────────────────────────────────────────────────────────────────
export function Ring({ size, stroke = 14, progress, color, trackColor, outlineColor, children, accessibilityLabel }: {
  size: number;
  stroke?: number;
  /** 0..1 */
  progress: number;
  color?: string;
  trackColor?: string;
  /** Optional darker edge drawn under the progress arc (light mode) */
  outlineColor?: string;
  children?: ReactNode;
  accessibilityLabel?: string;
}) {
  const c = useTheme();
  const r = (size - stroke - 4) / 2;
  const circumference = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress || 0));
  const dash = `${circumference * p} ${circumference}`;
  const center = size / 2;
  return (
    <View style={{ width: size, height: size }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={r} stroke={trackColor ?? c.track} strokeWidth={stroke} fill="none" />
        {p > 0 && outlineColor ? (
          <Circle cx={center} cy={center} r={r} stroke={outlineColor} strokeWidth={stroke + 4} fill="none"
            strokeLinecap="round" strokeDasharray={dash} rotation={-90} origin={`${center}, ${center}`} />
        ) : null}
        {p > 0 ? (
          <Circle cx={center} cy={center} r={r} stroke={color ?? c.accent} strokeWidth={stroke} fill="none"
            strokeLinecap="round" strokeDasharray={dash} rotation={-90} origin={`${center}, ${center}`} />
        ) : null}
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
}

// ── Bar ────────────────────────────────────────────────────────────────────
/** Outlined progress bar (the chunky "C" bar). */
export function Bar({ progress, height = 10, color, style }: {
  progress: number;
  height?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const p = Math.max(0, Math.min(1, progress || 0));
  return (
    <View style={[{ height, borderRadius: height / 2, borderWidth: STROKE.bar, borderColor: c.textPrimary, overflow: 'hidden' }, style]}>
      <View style={{ height: '100%', width: `${p * 100}%`, backgroundColor: color ?? c.textPrimary }} />
    </View>
  );
}

// ── Chip ───────────────────────────────────────────────────────────────────
export function Chip({ label, selected, onPress, style, ...rest }: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
} & Omit<TouchableOpacityProps, 'style' | 'onPress'>) {
  const c = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      {...rest}
      style={[
        {
          minHeight: 44,
          paddingHorizontal: 10,
          borderRadius: RADIUS.control,
          borderWidth: STROKE.control,
          borderColor: selected ? c.textPrimary : c.borderPrimary,
          backgroundColor: selected ? c.textPrimary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: FONTS.mono, fontWeight: '600', fontSize: 13, color: selected ? c.backgroundPrimary : c.textPrimary }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Sticker ────────────────────────────────────────────────────────────────
/** A small tilted tag, e.g. the streak badge. */
export function Sticker({ children, background, color, rotate = -4, style }: {
  children: ReactNode;
  background?: string;
  color?: string;
  rotate?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  return (
    <View style={[{
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10,
      backgroundColor: background ?? c.accent,
      transform: [{ rotate: `${rotate}deg` }],
    }, style]}>
      {typeof children === 'string' ? (
        <Text style={{ fontFamily: FONTS.mono, fontWeight: '600', fontSize: 12, color: color ?? c.onAccent }}>{children}</Text>
      ) : children}
    </View>
  );
}
