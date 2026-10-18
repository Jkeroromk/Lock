import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Image, Pressable, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';

/**
 * A mascot picture brought to life procedurally: it breathes and sways, hops
 * when tapped, squishes when it changes pose, blinks (when given a blink
 * frame), floats hearts and, while asleep, little Zs. Art is bottom-aligned,
 * so every squash keeps the feet on the ground.
 */
export interface PetSpriteHandle {
  hop: () => void;
  hearts: (n?: number) => void;
  /** Stage-up pop: small → overshoot → settle. */
  grow: () => void;
}

interface Props {
  source: ImageSourcePropType;
  /** Same pose with eyes shut; enables blinking. */
  blinkSource?: ImageSourcePropType;
  size: number;
  sleeping?: boolean;
  /** Slower, smaller breathing. */
  sad?: boolean;
  /** Static (thumbnails in lists). */
  still?: boolean;
  shadow?: boolean;
  /** Tap: hop + hearts, then this. */
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

type Fx = { id: number; kind: 'heart' | 'z'; dx: number; rot: number };
let fxId = 1;

function FloatFx({ fx, size }: { fx: Fx; size: number }) {
  const p = useSharedValue(0);
  const dur = fx.kind === 'heart' ? 1500 : 2500;
  useEffect(() => {
    p.value = withTiming(1, { duration: dur, easing: Easing.out(Easing.quad) });
  }, []);
  const rise = fx.kind === 'heart' ? size * 0.75 : size * 0.5;
  const style = useAnimatedStyle(() => {
    const v = p.value;
    const opacity = v < 0.15 ? v / 0.15 : 1 - (v - 0.15) / 0.85;
    const scale = v < 0.15 ? 0.4 + (v / 0.15) * 0.7 : 1.1 - (v - 0.15) * 0.3;
    return {
      opacity,
      transform: [
        { translateX: fx.dx * v },
        { translateY: -10 - rise * v },
        { scale: fx.kind === 'z' ? 0.6 + v * 0.7 : scale },
        { rotate: `${fx.rot * v}deg` },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: size / 2 - 10, top: size * 0.25 }, style]}>
      {fx.kind === 'heart' ? (
        <Ionicons name="heart" size={Math.max(14, size * 0.13)} color="#FF6F8E" />
      ) : (
        <Text style={{ fontSize: Math.max(13, size * 0.12), fontWeight: '800', color: '#6B7A99' }}>z</Text>
      )}
    </Animated.View>
  );
}

export const PetSprite = forwardRef<PetSpriteHandle, Props>(function PetSprite(
  { source, blinkSource, size, sleeping, sad, still, shadow = true, onPress, accessibilityLabel, style },
  ref,
) {
  const reduce = useReducedMotion();
  const animate = !still && !reduce;

  const phase = useSharedValue(0);
  const popX = useSharedValue(1);
  const popY = useSharedValue(1);
  const hopY = useSharedValue(0);
  const blink = useSharedValue(0);

  // Shown source lags the prop by 120 ms so the squish hides the swap.
  const [shown, setShown] = useState(source);
  const first = useRef(true);
  const [fx, setFx] = useState<Fx[]>([]);

  // Breathing / sway. Random start so two sprites never move in lockstep.
  const period = sleeping ? 3600 : sad ? 3400 : 2600;
  useEffect(() => {
    if (!animate) {
      phase.value = 0;
      return;
    }
    phase.value = 0;
    phase.value = withDelay(
      Math.floor(Math.random() * 600),
      withRepeat(withTiming(1, { duration: period, easing: Easing.linear }), -1, false),
    );
  }, [animate, period]);

  const amp = sleeping ? 1.5 : sad ? 0.6 : 1;
  const body = useAnimatedStyle(() => {
    const b = Math.sin(phase.value * Math.PI * 2);
    const sway = Math.cos(phase.value * Math.PI * 2);
    const sy = (1 + 0.018 * b * amp) * popY.value;
    const sx = (1 - 0.011 * b * amp) * popX.value;
    return {
      transform: [
        // Keep the feet planted: scaling happens around the centre.
        { translateY: hopY.value + ((1 - sy) * size) / 2 },
        { scaleX: sx },
        { scaleY: sy },
        { rotate: `${sleeping || sad ? 0 : sway}deg` },
      ],
    };
  });
  const shadowStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 + (hopY.value / size) * 1.2 }],
    opacity: 1 + (hopY.value / size) * 1.5,
  }));
  const blinkStyle = useAnimatedStyle(() => ({ opacity: blink.value }));

  const squish = useCallback(() => {
    if (!animate) return;
    popX.value = withSequence(withTiming(1.14, { duration: 128 }), withTiming(1, { duration: 192, easing: Easing.out(Easing.back(2)) }));
    popY.value = withSequence(withTiming(0.84, { duration: 128 }), withTiming(1, { duration: 192, easing: Easing.out(Easing.back(2)) }));
  }, [animate]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      setShown(source);
      return;
    }
    if (!animate) {
      setShown(source);
      return;
    }
    squish();
    const t = setTimeout(() => setShown(source), 120);
    return () => clearTimeout(t);
  }, [source]);

  const hop = useCallback(() => {
    if (!animate) return;
    const h = -Math.max(18, size * 0.24);
    popX.value = withSequence(
      withTiming(1.12, { duration: 93 }), withTiming(0.92, { duration: 186 }),
      withTiming(1.1, { duration: 186 }), withTiming(1, { duration: 155 }),
    );
    popY.value = withSequence(
      withTiming(0.86, { duration: 93 }), withTiming(1.1, { duration: 186 }),
      withTiming(0.9, { duration: 186 }), withTiming(1, { duration: 155 }),
    );
    hopY.value = withSequence(
      withTiming(0, { duration: 93 }),
      withTiming(h, { duration: 186, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 186, easing: Easing.in(Easing.quad) }),
      withTiming(0, { duration: 155 }),
    );
  }, [animate, size]);

  const grow = useCallback(() => {
    if (!animate) return;
    popX.value = 0.6;
    popY.value = 0.6;
    popX.value = withSequence(withTiming(1.12, { duration: 360, easing: Easing.out(Easing.cubic) }), withTiming(1, { duration: 240 }));
    popY.value = withSequence(withTiming(1.12, { duration: 360, easing: Easing.out(Easing.cubic) }), withTiming(1, { duration: 240 }));
  }, [animate]);

  const addFx = useCallback((kind: Fx['kind'], n: number) => {
    const items: Fx[] = Array.from({ length: n }, (_, i) => ({
      id: fxId++,
      kind,
      dx: kind === 'z' ? size * 0.25 : (i - (n - 1) / 2) * size * 0.18 + (Math.random() - 0.5) * size * 0.1,
      rot: (Math.random() - 0.5) * 40,
    }));
    setFx((prev) => [...prev, ...items]);
    const ids = new Set(items.map((x) => x.id));
    setTimeout(() => setFx((prev) => prev.filter((x) => !ids.has(x.id))), kind === 'heart' ? 1600 : 2600);
  }, [size]);

  const hearts = useCallback((n = 3) => {
    if (reduce) return;
    addFx('heart', n);
  }, [addFx, reduce]);

  useImperativeHandle(ref, () => ({ hop, hearts, grow }), [hop, hearts, grow]);

  // Blink every 2.2–4.8 s; one in four is a double blink.
  useEffect(() => {
    if (!blinkSource || !animate || sleeping) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const once = (then?: () => void) => {
      blink.value = 1;
      timer = setTimeout(() => {
        blink.value = 0;
        if (then) timer = setTimeout(then, 130);
      }, 130);
    };
    const loop = () => {
      timer = setTimeout(() => {
        if (!alive) return;
        once(Math.random() < 0.25 ? () => once() : undefined);
        loop();
      }, 2200 + Math.random() * 2600);
    };
    loop();
    return () => {
      alive = false;
      clearTimeout(timer);
      blink.value = 0;
    };
  }, [blinkSource, animate, sleeping]);

  // Zs while asleep.
  useEffect(() => {
    if (!sleeping || !animate) return;
    addFx('z', 1);
    const id = setInterval(() => addFx('z', 1), 1500);
    return () => clearInterval(id);
  }, [sleeping, animate, addFx]);

  const content = (
    <View style={[{ width: size, height: size }, style]}>
      {shadow ? (
        <Animated.View
          pointerEvents="none"
          style={[{
            position: 'absolute', left: size * 0.22, right: size * 0.22, bottom: size * 0.01,
            height: Math.max(4, size * 0.06), borderRadius: size, backgroundColor: 'rgba(10,10,10,0.12)',
          }, shadowStyle]}
        />
      ) : null}
      <Animated.View style={[{ width: size, height: size }, body]}>
        <Image source={shown} style={{ width: size, height: size }} resizeMode="contain" />
        {blinkSource ? (
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0 }, blinkStyle]}>
            <Image source={blinkSource} style={{ width: size, height: size }} resizeMode="contain" />
          </Animated.View>
        ) : null}
      </Animated.View>
      {fx.map((f) => <FloatFx key={f.id} fx={f} size={size} />)}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      onPress={() => {
        hop();
        hearts(3);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
    >
      {content}
    </Pressable>
  );
});
