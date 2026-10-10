/**
 * Lock "B×C" design primitives. Build screens from these so the look stays
 * consistent: Card (default / hero / inverse), Ring, Bar, Chip, Sticker, Label,
 * Button, IconButton, ScreenHeader, Segmented, Corners, TextField.
 */
import { ReactNode, forwardRef } from 'react';
import { View, TouchableOpacity, ActivityIndicator, TextInput as RNTextInput, type ViewStyle, type StyleProp, type TouchableOpacityProps, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { Text, TextInput } from '@/components/ui/Text';
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
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontFamily: FONTS.mono, fontWeight: '600', fontSize: 13, color: selected ? c.backgroundPrimary : c.textPrimary }}>
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

// ── Button ─────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'solid' | 'outline';

/**
 * primary: yellow with ink stroke (the one main action on a screen)
 * solid:   ink on paper / paper on ink
 * outline: stroked, transparent
 */
export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, style, accessibilityLabel }: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const c = useTheme();
  const palette = {
    primary: { bg: c.accent, border: c.ink, fg: c.onAccent },
    solid: { bg: c.textPrimary, border: c.textPrimary, fg: c.backgroundPrimary },
    outline: { bg: 'transparent', border: c.borderPrimary, fg: c.textPrimary },
  }[variant];
  const inactive = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={[{
        minHeight: 52, borderRadius: 14, borderWidth: STROKE.control, borderColor: palette.border,
        backgroundColor: palette.bg, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        opacity: disabled && !loading ? 0.45 : 1,
      }, style]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon as any} size={19} color={palette.fg} /> : null}
          <Text style={{ fontSize: 17, fontWeight: '800', color: palette.fg }}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ── IconButton ─────────────────────────────────────────────────────────────
export function IconButton({ icon, onPress, accessibilityLabel, filled, style }: {
  icon: string;
  onPress?: () => void;
  accessibilityLabel: string;
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[{
        width: 44, height: 44, borderRadius: RADIUS.control, borderWidth: STROKE.control,
        borderColor: filled ? c.ink : c.borderPrimary, backgroundColor: filled ? c.accent : 'transparent',
        alignItems: 'center', justifyContent: 'center',
      }, style]}
    >
      <Ionicons name={icon as any} size={20} color={filled ? c.onAccent : c.textPrimary} />
    </TouchableOpacity>
  );
}

// ── ScreenHeader ───────────────────────────────────────────────────────────
/** Big tab-screen title, optional mono caption and a right-hand slot. */
export function ScreenHeader({ title, caption, right, style }: {
  title: string;
  caption?: string;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  return (
    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8, marginBottom: 16 }, style]}>
      <View style={{ flex: 1 }}>
        <Text accessibilityRole="header" style={{ fontSize: 40, fontWeight: '800', letterSpacing: -1.6, lineHeight: 42, color: c.textPrimary }}>
          {title}
        </Text>
        {caption ? (
          <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.textSecondary, marginTop: 8, textTransform: 'uppercase' }}>
            {caption}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

// ── Segmented ──────────────────────────────────────────────────────────────
/** Equal-width row of chips; exactly one selected. `badge` adds a yellow dot. */
export function Segmented<K extends string>({ options, value, onChange, style }: {
  options: { key: K; label: string; badge?: boolean }[];
  value: K;
  onChange: (key: K) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  return (
    <View style={[{ flexDirection: 'row', gap: 6 }, style]} accessibilityRole="tablist">
      {options.map((o) => (
        <View key={o.key} style={{ flex: 1 }}>
          <Chip
            label={o.label.toUpperCase()}
            selected={o.key === value}
            onPress={() => onChange(o.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: o.key === value }}
            style={{ paddingHorizontal: 4 }}
          />
          {o.badge ? (
            <View pointerEvents="none" style={{
              position: 'absolute', top: -3, right: -3, width: 12, height: 12, borderRadius: 6,
              backgroundColor: c.accent, borderWidth: 2, borderColor: c.ink,
            }} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

// ── Corners ────────────────────────────────────────────────────────────────
/** Camera-viewfinder corner brackets drawn over a box (pointerEvents none). */
export function Corners({ color, inset = 12, size = 30, stroke = 4 }: {
  color?: string;
  inset?: number;
  size?: number;
  stroke?: number;
}) {
  const c = useTheme();
  const col = color ?? c.accent;
  const base = { position: 'absolute' as const, width: size, height: size, borderColor: col };
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <View style={[base, { top: inset, left: inset, borderTopWidth: stroke, borderLeftWidth: stroke, borderTopLeftRadius: 12 }]} />
      <View style={[base, { top: inset, right: inset, borderTopWidth: stroke, borderRightWidth: stroke, borderTopRightRadius: 12 }]} />
      <View style={[base, { bottom: inset, left: inset, borderBottomWidth: stroke, borderLeftWidth: stroke, borderBottomLeftRadius: 12 }]} />
      <View style={[base, { bottom: inset, right: inset, borderBottomWidth: stroke, borderRightWidth: stroke, borderBottomRightRadius: 12 }]} />
    </View>
  );
}

// ── TextField ──────────────────────────────────────────────────────────────
/** 52pt stroked input. `right` renders inside the field (e.g. a show-password toggle). */
export const TextField = forwardRef<RNTextInput, TextInputProps & { right?: ReactNode; containerStyle?: StyleProp<ViewStyle> }>(
  function TextField({ style, right, containerStyle, ...props }, ref) {
    const c = useTheme();
    return (
      <View style={[{
        flexDirection: 'row', alignItems: 'center', minHeight: 52, borderRadius: 14,
        borderWidth: STROKE.control, borderColor: c.borderPrimary, backgroundColor: c.cardBackground,
        paddingLeft: 14, paddingRight: right ? 4 : 14,
      }, containerStyle]}>
        <TextInput
          ref={ref}
          placeholderTextColor={c.textSecondary}
          {...props}
          style={[{ flex: 1, fontSize: 16, fontWeight: '500', color: c.textPrimary, paddingVertical: 12 }, style]}
        />
        {right}
      </View>
    );
  },
);
