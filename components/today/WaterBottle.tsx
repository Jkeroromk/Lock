import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSpring, withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { usePetStore } from '@/store/usePetStore';
import { buddyImage } from '@/constants/pets';
import { PetSprite, type PetSpriteHandle } from '@/components/pet/PetSprite';

const WATER = '#4DB6FF';
const WATER_LIGHT = '#9ED8FF';
const CAP_H = 24;
const BUDDY = 92;

/** One crest-and-trough per 100 units; the strip is two copies wide so it can loop. */
function waveD(width: number, h: number) {
  const n = Math.ceil(width / 50);
  let d = `M0 ${h / 2}`;
  for (let i = 0; i < n; i++) d += ` Q ${i * 50 + 25} ${i % 2 === 0 ? 0 : h} ${i * 50 + 50} ${h / 2}`;
  return `${d} V ${h + 4} H 0 Z`;
}

/** Phone tilt (−1…1 left/right), from the accelerometer. expo-sensors may be
 *  missing in an older binary (OTA update): then the water just stays level. */
function useTilt(enabled: boolean) {
  const tilt = useSharedValue(0);
  useEffect(() => {
    if (!enabled) return;
    let sub: { remove: () => void } | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Accelerometer } = require('expo-sensors');
      Accelerometer.setUpdateInterval(60);
      sub = Accelerometer.addListener(({ x }: { x: number }) => {
        tilt.value = withSpring(Math.max(-1, Math.min(1, x)), { damping: 9, stiffness: 70 });
      });
    } catch {}
    return () => sub?.remove();
  }, [enabled]);
  return tilt;
}

/**
 * The hydration bottle: water rises with today's total, the surface waves, the
 * buddy floats on top, and tilting the phone sloshes the water (it stays level
 * while the bottle tilts).
 */
export default function WaterBottle({ level, width, height, celebrate, splash = 0 }: {
  /** 0…1 of today's goal. */
  level: number;
  width: number;
  height: number;
  /** Changes each time the goal is reached → the buddy cheers. */
  celebrate: number;
  /** Changes each time a drink is added → the buddy hops and the water splashes. */
  splash?: number;
}) {
  const c = useTheme();
  const reduce = useReducedMotion();
  const pet = usePetStore((s) => s.state);
  const buddy = buddyImage(pet?.profile?.buddyKind ?? 'cat', pet?.stage ?? 1);
  const ref = useRef<PetSpriteHandle>(null);

  const bodyH = height - CAP_H - 4;
  const fill = useSharedValue(Math.min(1, Math.max(0, level)));
  useEffect(() => {
    fill.value = withSpring(Math.min(1, Math.max(0, level)), { damping: 14, stiffness: 90 });
  }, [level]);
  useEffect(() => {
    if (celebrate > 0) {
      ref.current?.hop();
      ref.current?.hearts(5);
    }
  }, [celebrate]);

  const wave = useSharedValue(0);
  const bob = useSharedValue(0);
  const swim = useSharedValue(0.5);
  const bubbles = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    wave.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.linear }), -1, false);
    bob.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true);
    // Paddles slowly from side to side.
    swim.value = withRepeat(withTiming(1, { duration: 3800, easing: Easing.inOut(Easing.sin) }), -1, true);
    bubbles.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1, false);
  }, [reduce]);

  // A drink went in: splash + the buddy hops.
  const splashP = useSharedValue(1);
  useEffect(() => {
    if (splash <= 0) return;
    ref.current?.hop();
    splashP.value = 0;
    splashP.value = withTiming(1, { duration: 750, easing: Easing.out(Easing.quad) });
  }, [splash]);
  const tilt = useTilt(!reduce);

  const W2 = width * 2;
  const waterStyle = useAnimatedStyle(() => ({
    top: (1 - fill.value) * bodyH - 6,
    transform: [{ rotate: `${-tilt.value * 22}deg` }],
  }));
  const waveFront = useAnimatedStyle(() => ({ transform: [{ translateX: -wave.value * 100 }] }));
  const waveBack = useAnimatedStyle(() => ({ transform: [{ translateX: -100 + wave.value * 100 }] }));
  const sway = width * 0.14;
  const buddyStyle = useAnimatedStyle(() => {
    const surface = CAP_H + 4 + (1 - fill.value) * bodyH;
    return {
      top: Math.max(0, Math.min(height - BUDDY + 6, surface - BUDDY + 22)) + bob.value * -5,
      transform: [
        { translateX: tilt.value * 18 + (swim.value - 0.5) * 2 * sway * Math.min(1, fill.value * 4) },
        { rotate: `${-tilt.value * 14 + (bob.value - 0.5) * 6 + (swim.value - 0.5) * 8}deg` },
      ],
    };
  });
  // Splash at the surface where the buddy is: a ripple and four drops.
  const surfaceStyle = useAnimatedStyle(() => ({
    top: CAP_H + 4 + (1 - fill.value) * bodyH - 4,
    transform: [{ translateX: tilt.value * 18 + (swim.value - 0.5) * 2 * sway * Math.min(1, fill.value * 4) }],
  }));
  const ripple = useAnimatedStyle(() => ({
    opacity: splashP.value < 1 ? 1 - splashP.value : 0,
    transform: [{ scaleX: 0.4 + splashP.value * 1.4 }, { scaleY: 0.4 + splashP.value * 0.6 }],
  }));
  const drop = (dx: number, up: number) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => ({
      opacity: splashP.value < 1 ? 1 - splashP.value : 0,
      transform: [{ translateX: dx * splashP.value }, { translateY: -up * Math.sin(Math.PI * splashP.value) }],
    }));
  const drops = [drop(-34, 26), drop(-14, 40), drop(14, 38), drop(34, 24)];
  // Little bubbles rising through the water.
  const bubble = (x: number, phase: number, size: number) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      const t = (bubbles.value + phase) % 1;
      const depth = fill.value * bodyH;
      return {
        left: x + Math.sin(t * Math.PI * 4) * 4,
        bottom: t * Math.max(0, depth - 14),
        opacity: depth > 24 ? (t < 0.85 ? 0.9 : (1 - t) * 6) : 0,
        width: size, height: size,
      };
    });
  const bubbleStyles = [bubble(width * 0.22, 0, 8), bubble(width * 0.6, 0.35, 6), bubble(width * 0.4, 0.7, 10)];

  return (
    <View style={{ width, height }}>
      {/* Cap */}
      <View style={{ position: 'absolute', left: width / 2 - 28, top: 0, width: 56, height: CAP_H, borderRadius: 8, borderWidth: 3, borderColor: c.ink, backgroundColor: c.accent }} />
      {/* Body */}
      <View style={{
        position: 'absolute', left: 0, right: 0, top: CAP_H + 4, bottom: 0, overflow: 'hidden',
        borderWidth: 3, borderColor: c.ink, borderTopLeftRadius: 46, borderTopRightRadius: 46, borderBottomLeftRadius: 34, borderBottomRightRadius: 34,
        backgroundColor: c.cardBackground,
      }}>
        <Animated.View style={[{ position: 'absolute', left: -width / 2, width: W2, height: bodyH * 2 }, waterStyle]}>
          <Animated.View style={[{ position: 'absolute', left: 0, top: -10, width: W2 + 200, height: 16 }, waveBack]}>
            <Svg width={W2 + 200} height={16}><Path d={waveD(W2 + 200, 12)} fill={WATER_LIGHT} /></Svg>
          </Animated.View>
          <Animated.View style={[{ position: 'absolute', left: 0, top: -6, width: W2 + 200, height: 16 }, waveFront]}>
            <Svg width={W2 + 200} height={16}><Path d={waveD(W2 + 200, 12)} fill={WATER} /></Svg>
          </Animated.View>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 6, bottom: 0, backgroundColor: WATER }} />
        </Animated.View>
        {bubbleStyles.map((st, i) => (
          <Animated.View key={i} style={[{ position: 'absolute', borderRadius: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' }, st]} />
        ))}
        {[0.25, 0.5, 0.75].map((p) => (
          <View key={p} style={{ position: 'absolute', right: 10, bottom: bodyH * p, width: 14, borderTopWidth: 2, borderColor: c.ink }} />
        ))}
      </View>
      {/* Splash where a drink lands */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: width / 2 - 40, width: 80, height: 10, alignItems: 'center' }, surfaceStyle]}>
        <Animated.View style={[{ width: 80, height: 14, borderRadius: 40, borderWidth: 2, borderColor: WATER_LIGHT }, ripple]} />
        {drops.map((st, i) => (
          <Animated.View key={i} style={[{ position: 'absolute', left: 36, top: -2, width: 8, height: 10, borderRadius: 5, backgroundColor: WATER }, st]} />
        ))}
      </Animated.View>
      {/* Buddy floating on the surface (sleeps while the bottle is empty; tap it) */}
      <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', left: width / 2 - BUDDY / 2, width: BUDDY, height: BUDDY }, buddyStyle]}>
        <PetSprite ref={ref} source={buddy} size={BUDDY} shadow={false} sleeping={level <= 0} onPress={() => {}} accessibilityLabel="buddy" />
      </Animated.View>
    </View>
  );
}
