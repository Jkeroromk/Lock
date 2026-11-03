import { useEffect, useState, type ReactNode } from 'react';
import { View, Modal, Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import { PressScale } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { useDeviceLayout } from '@/hooks/useDeviceLayout';
import { DRINKS, drinkAmounts, type DrinkKind } from '@/constants/drinks';
import { QUICK_ADD_ML } from '@/services/waterTracker';

const ITEM = 62;
const SIZE_ITEM = 52;

/**
 * "+" on the hydration card: a ship's wheel of drinks spins open out of the
 * button, the drinks pop out one after another like a fan. Pick a drink and an
 * inner ring of cup sizes fans out; pick a size and the drink is added.
 * "Custom" opens the full sheet (any amount).
 */
export default function DrinkWheel({ visible, anchor, onClose, onAdd, onCustom }: {
  visible: boolean;
  /** Centre of the "+" button, in window coordinates. */
  anchor: { x: number; y: number } | null;
  onClose: () => void;
  onAdd: (kind: DrinkKind, ml: number) => void;
  onCustom: (kind: DrinkKind) => void;
}) {
  const c = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { fold } = useDeviceLayout();
  const [shown, setShown] = useState(false);
  const [kind, setKind] = useState<DrinkKind | null>(null);

  // Centre of the wheel: the middle of the half the button is on (never on
  // the fold of an open Duo), else the middle of the screen.
  let cx = width / 2;
  let cy = height / 2;
  let room = Math.min(width - insets.left - insets.right, height - insets.top - insets.bottom);
  if (fold?.axis === 'vertical') {
    const right = (anchor?.x ?? width) > fold.start;
    const a = right ? fold.start + fold.width : insets.left;
    const b = right ? width - insets.right : fold.start;
    cx = (a + b) / 2;
    room = Math.min(b - a, height - insets.top - insets.bottom);
  } else if (fold?.axis === 'horizontal') {
    const below = (anchor?.y ?? height) > fold.start;
    const a = below ? fold.start + fold.width : insets.top;
    const b = below ? height - insets.bottom : fold.start;
    cy = (a + b) / 2;
    room = Math.min(width - insets.left - insets.right, b - a);
  }
  const R = Math.max(110, Math.min(170, room / 2 - ITEM / 2 - 8));
  const r2 = R * 0.56;

  const open = useSharedValue(0);
  const sizes = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setShown(true);
      setKind(null);
      sizes.value = 0;
      open.value = 0;
      open.value = withTiming(1, { duration: 620, easing: Easing.out(Easing.back(1.4)) });
    }
  }, [visible]);

  const close = (after?: () => void) => {
    open.value = withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) }, (done) => {
      if (done) {
        runOnJS(setShown)(false);
        if (after) runOnJS(after)();
      }
    });
  };

  const pickDrink = (k: DrinkKind) => {
    Haptics.selectionAsync().catch(() => {});
    setKind(k);
    sizes.value = 0;
    sizes.value = withSpring(1, { damping: 12, stiffness: 140 });
  };
  const pickSize = (ml: number) => {
    if (!kind) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const k = kind;
    close(() => onAdd(k, ml));
    onClose();
  };
  const custom = () => {
    const k = kind ?? 'water';
    close(() => onCustom(k));
    onClose();
  };

  // The whole wheel flies out of the button, spinning like a helm.
  const ax = anchor?.x ?? cx;
  const ay = anchor?.y ?? cy;
  const wheel = useAnimatedStyle(() => ({
    opacity: Math.min(1, open.value * 2),
    transform: [
      { translateX: (ax - cx) * (1 - open.value) },
      { translateY: (ay - cy) * (1 - open.value) },
      { scale: 0.15 + 0.85 * open.value },
      { rotate: `${(1 - open.value) * -160}deg` },
    ],
  }));
  const dim = useAnimatedStyle(() => ({ opacity: Math.min(1, open.value * 1.5) }));

  if (!shown && !visible) return null;

  const n = DRINKS.length;
  const sizeOpts: (number | 'custom')[] = [...QUICK_ADD_ML, 'custom'];
  const chosen = kind ? DRINKS.find((d) => d.kind === kind)! : null;

  return (
    <Modal visible={shown || visible} transparent animationType="none" onRequestClose={() => { close(); onClose(); }}>
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }, dim]}>
        <Pressable style={{ flex: 1 }} onPress={() => { close(); onClose(); }} accessibilityLabel={t('common.close')} />
      </Animated.View>

      <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', left: cx - R - ITEM / 2, top: cy - R - ITEM / 2, width: (R + ITEM / 2) * 2, height: (R + ITEM / 2) * 2 }, wheel]}>
        {/* Rim and spokes of the helm */}
        <View pointerEvents="none" style={{ position: 'absolute', left: ITEM / 2, top: ITEM / 2, width: R * 2, height: R * 2, borderRadius: R, borderWidth: 6, borderColor: c.accent }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: ITEM / 2 + 10, top: ITEM / 2 + 10, width: R * 2 - 20, height: R * 2 - 20, borderRadius: R, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' }} />
        {DRINKS.map((d, i) => {
          const angle = (i / n) * 360 - 90;
          return (
            <View key={`spoke-${d.kind}`} pointerEvents="none" style={{
              position: 'absolute', left: R + ITEM / 2 - R / 2, top: R + ITEM / 2 - 1.5, width: R, height: 3,
              backgroundColor: 'rgba(255,255,255,0.35)', transform: [{ rotate: `${angle}deg` }, { translateX: R / 2 }],
            }} />
          );
        })}

        {/* Drinks on the rim, popping out one after another */}
        {DRINKS.map((d, i) => {
          const angle = ((i / n) * 2 - 0.5) * Math.PI;
          const x = R + Math.cos(angle) * R;
          const y = R + Math.sin(angle) * R;
          const on = kind === d.kind;
          const dimmed = kind !== null && !on;
          return (
            <WheelItem key={d.kind} progress={open} index={i} count={n} style={{ left: x, top: y, width: ITEM, height: ITEM }}>
              <PressScale
                onPress={() => pickDrink(d.kind)}
                scaleTo={0.88}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t(`water.drinks.${d.kind}` as any)}
                style={{
                  width: ITEM, height: ITEM, borderRadius: ITEM / 2, borderWidth: 2, borderColor: c.ink,
                  backgroundColor: on ? c.accent : c.cardBackground, alignItems: 'center', justifyContent: 'center', opacity: dimmed ? 0.55 : 1,
                  shadowColor: c.ink, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 3, height: 3 },
                }}
              >
                <Ionicons name={d.icon as any} size={20} color={on ? c.onAccent : c.textPrimary} />
                <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '800', color: on ? c.onAccent : c.textPrimary, maxWidth: ITEM - 8 }}>
                  {t(`water.drinks.${d.kind}` as any)}
                </Text>
              </PressScale>
            </WheelItem>
          );
        })}

        {/* Inner ring: cup sizes fan out once a drink is picked */}
        {kind ? sizeOpts.map((opt, i) => {
          const angle = ((i / sizeOpts.length) * 2 - 0.5) * Math.PI;
          const x = R + ITEM / 2 - SIZE_ITEM / 2 + Math.cos(angle) * r2;
          const y = R + ITEM / 2 - SIZE_ITEM / 2 + Math.sin(angle) * r2;
          return (
            <WheelItem key={`size-${opt}`} progress={sizes} index={i} count={sizeOpts.length} spin style={{ left: x, top: y, width: SIZE_ITEM, height: SIZE_ITEM }}>
              <PressScale
                onPress={() => (opt === 'custom' ? custom() : pickSize(opt))}
                scaleTo={0.88}
                accessibilityRole="button"
                accessibilityLabel={opt === 'custom' ? t('water.custom') : `${opt} ml`}
                style={{
                  width: SIZE_ITEM, height: SIZE_ITEM, borderRadius: SIZE_ITEM / 2, borderWidth: 2, borderColor: c.ink,
                  backgroundColor: opt === 'custom' ? c.cardBackground : c.surfaceInverse, alignItems: 'center', justifyContent: 'center',
                  borderStyle: opt === 'custom' ? 'dashed' : 'solid',
                }}
              >
                {opt === 'custom'
                  ? <Ionicons name="create-outline" size={18} color={c.textPrimary} />
                  : <Text style={{ fontFamily: FONTS.mono, fontSize: 13, fontWeight: '700', color: c.textInverse }}>{opt}</Text>}
              </PressScale>
            </WheelItem>
          );
        }) : null}

        {/* Hub */}
        <View pointerEvents="none" style={{
          position: 'absolute', left: R + ITEM / 2 - 46, top: R + ITEM / 2 - 46, width: 92, height: 92, borderRadius: 46,
          borderWidth: 3, borderColor: c.ink, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
        }}>
          {chosen ? (
            <>
              <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '800', color: c.onAccent }}>{t(`water.drinks.${chosen.kind}` as any)}</Text>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: c.onAccent }}>
                {Math.round(chosen.factor * 100)}%{chosen.kcal > 0 ? ` · ${drinkAmounts(chosen, 100).kcal}/100ml` : ''}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: c.onAccent, marginTop: 2 }}>{t('water.size')}</Text>
            </>
          ) : (
            <>
              <Ionicons name="water" size={22} color={c.onAccent} />
              <Text numberOfLines={2} style={{ fontSize: 12, fontWeight: '800', color: c.onAccent, textAlign: 'center' }}>{t('water.pickDrink')}</Text>
            </>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}

/** One button on the wheel: pops out in turn (the fan), with a little spin for the inner ring. */
function WheelItem({ progress, index, count, spin, style, children }: {
  progress: SharedValue<number>;
  index: number;
  count: number;
  spin?: boolean;
  style: { left: number; top: number; width: number; height: number };
  children: ReactNode;
}) {
  const start = (index / count) * 0.45;
  const st = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, (progress.value - start) / 0.55));
    return {
      opacity: p,
      transform: [{ scale: 0.3 + 0.7 * p }, { rotate: `${spin ? (1 - p) * -90 : 0}deg` }],
    };
  });
  return <Animated.View style={[{ position: 'absolute' }, style, st]}>{children}</Animated.View>;
}
