/**
 * Lock "B×C" design primitives. Build screens from these so the look stays
 * consistent: Card (default / hero / inverse), Ring, Bar, Chip, Sticker, Label,
 * Button, IconButton, ScreenHeader, Segmented, Corners, TextField.
 * Motion: PressScale (press feedback), Appear (staggered entrance); Ring and Bar animate.
 */
import { ReactNode, forwardRef, useEffect, useState } from 'react';
import { View, Pressable, ActivityIndicator, TextInput as RNTextInput, type ViewStyle, type StyleProp, type PressableProps, type TextInputProps, type GestureResponderEvent } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps, withSpring, withTiming, Easing, FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { Text, TextInput } from '@/components/ui/Text';
import { FONTS } from '@/constants/fonts';
import { useTheme } from '@/hooks/useTheme';
import { hasCJK } from '@/lib/cjk';

export const RADIUS = { card: 22, hero: 24, control: 13, cell: 6 } as const;
export const STROKE = { card: 2, control: 2, bar: 1.5 } as const;
export const SHADOW_OFFSET = 5;


// ── Motion ─────────────────────────────────────────────────────────────────
/** Shared timing so every animated piece feels like the same app. */
export const MOTION = {
  press: { damping: 18, stiffness: 420, mass: 0.6 },
  slide: { damping: 22, stiffness: 260, mass: 0.7 },
  fill: { duration: 850, easing: Easing.out(Easing.cubic) },
} as const;

const APressable = Animated.createAnimatedComponent(Pressable);

/** Pressable that squashes slightly while held — the base of every B×C control. */
export function PressScale({ children, style, scaleTo = 0.96, onPressIn, onPressOut, ...rest }: Omit<PressableProps, 'style'> & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <APressable
      {...rest}
      onPressIn={(e: GestureResponderEvent) => { scale.value = withSpring(scaleTo, MOTION.press); onPressIn?.(e); }}
      onPressOut={(e: GestureResponderEvent) => { scale.value = withSpring(1, MOTION.press); onPressOut?.(e); }}
      style={[style, animated]}
    >
      {children}
    </APressable>
  );
}

/** Staggered rise-in for screen sections. `index` sets the delay (60 ms apart). */
export function Appear({ children, index = 0, style }: { children: ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(420).easing(Easing.out(Easing.cubic))} style={style}>
      {children}
    </Animated.View>
  );
}

/** Animates 0 → value on mount and value → value on change. */
function useAnimatedProgress(target: number) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withTiming(Math.max(0, Math.min(1, target || 0)), MOTION.fill);
  }, [target, v]);
  return v;
}

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
const ACircle = Animated.createAnimatedComponent(Circle);

export function Ring({ size, stroke = 14, progress, color, trackColor, outlineColor, children, accessibilityLabel }: {
  size: number;
  stroke?: number;
  /** 0..1 — the arc sweeps to it on mount and whenever it changes */
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
  const center = size / 2;
  const p = useAnimatedProgress(progress);
  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - p.value),
    strokeOpacity: p.value > 0.002 ? 1 : 0,
  }));
  const dash = `${circumference} ${circumference}`;
  return (
    <View style={{ width: size, height: size }} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={r} stroke={trackColor ?? c.track} strokeWidth={stroke} fill="none" />
        {outlineColor ? (
          <ACircle cx={center} cy={center} r={r} stroke={outlineColor} strokeWidth={stroke + 4} fill="none"
            strokeLinecap="round" strokeDasharray={dash} animatedProps={arcProps} rotation={-90} origin={`${center}, ${center}`} />
        ) : null}
        <ACircle cx={center} cy={center} r={r} stroke={color ?? c.accent} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={dash} animatedProps={arcProps} rotation={-90} origin={`${center}, ${center}`} />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
}

// ── Bar ────────────────────────────────────────────────────────────────────
/** Outlined progress bar (the chunky "C" bar). Fills in on mount and on change. */
export function Bar({ progress, height = 10, color, style }: {
  progress: number;
  height?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const [width, setWidth] = useState(0);
  const p = useAnimatedProgress(progress);
  const fill = useAnimatedStyle(() => ({ width: width * p.value }));
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width - STROKE.bar * 2)}
      style={[{ height, borderRadius: height / 2, borderWidth: STROKE.bar, borderColor: c.textPrimary, overflow: 'hidden' }, style]}
    >
      <Animated.View style={[{ height: '100%', backgroundColor: color ?? c.textPrimary }, fill]} />
    </View>
  );
}

// ── Chip ───────────────────────────────────────────────────────────────────
export function Chip({ label, selected, onPress, style, ...rest }: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
} & Omit<PressableProps, 'style' | 'onPress' | 'children'>) {
  const c = useTheme();
  return (
    <PressScale
      onPress={onPress}
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
    </PressScale>
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
    <PressScale
      onPress={onPress}
      disabled={inactive}
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
    </PressScale>
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
    <PressScale
      onPress={onPress}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[{
        width: 44, height: 44, borderRadius: RADIUS.control, borderWidth: STROKE.control,
        borderColor: filled ? c.ink : c.borderPrimary, backgroundColor: filled ? c.accent : 'transparent',
        alignItems: 'center', justifyContent: 'center',
      }, style]}
    >
      <Ionicons name={icon as any} size={20} color={filled ? c.onAccent : c.textPrimary} />
    </PressScale>
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
  // CJK glyphs read larger than Latin at the same size; step down so a
  // two-character title like 日历 doesn't dominate the screen.
  const cjk = hasCJK(title);
  return (
    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8, marginBottom: 16 }, style]}>
      <View style={{ flex: 1 }}>
        <Text
          accessibilityRole="header"
          style={cjk
            ? { fontSize: 34, fontWeight: '700', lineHeight: 44, color: c.textPrimary }
            : { fontSize: 40, fontWeight: '800', letterSpacing: -1.6, lineHeight: 44, color: c.textPrimary }}
        >
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
/**
 * Equal-width segments with a solid pill that slides to the selected one.
 * `badge` adds a yellow dot (e.g. pending friend requests).
 */
export function Segmented<K extends string>({ options, value, onChange, style }: {
  options: { key: K; label: string; badge?: boolean }[];
  value: K;
  onChange: (key: K) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const GAP = 6;
  const [width, setWidth] = useState(0);
  const n = options.length;
  const segment = width > 0 ? (width - GAP * (n - 1)) / n : 0;
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const x = useSharedValue(0);
  const [placed, setPlaced] = useState(false);

  useEffect(() => {
    if (!segment) return;
    const target = index * (segment + GAP);
    if (!placed) { x.value = target; setPlaced(true); } // first layout: no slide
    else x.value = withSpring(target, MOTION.slide);
  }, [index, segment]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      style={[{ flexDirection: 'row', gap: GAP }, style]}
      accessibilityRole="tablist"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {segment > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, width: segment, borderRadius: RADIUS.control, backgroundColor: c.textPrimary }, pill]}
        />
      ) : null}
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <View key={o.key} style={{ flex: 1 }}>
            <PressScale
              onPress={() => onChange(o.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={o.label}
              style={{
                minHeight: 44, paddingHorizontal: 4, borderRadius: RADIUS.control, borderWidth: STROKE.control,
                borderColor: selected ? c.textPrimary : c.borderPrimary,
                backgroundColor: selected && !segment ? c.textPrimary : 'transparent',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontFamily: FONTS.mono, fontWeight: '600', fontSize: 13, color: selected ? c.backgroundPrimary : c.textPrimary }}>
                {o.label.toUpperCase()}
              </Text>
            </PressScale>
            {o.badge ? (
              <View pointerEvents="none" style={{
                position: 'absolute', top: -3, right: -3, width: 12, height: 12, borderRadius: 6,
                backgroundColor: c.accent, borderWidth: 2, borderColor: c.ink,
              }} />
            ) : null}
          </View>
        );
      })}
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
