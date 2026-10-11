import { ReactNode, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

/**
 * Soft fade + lift each time a tab becomes active.
 *
 * Replaces the tab navigator's own 'shift' transition, which could be cut off
 * by fast tab switching and leave a screen fully transparent (blank page).
 * Here every focus animates *to* opacity 1, so an interrupted animation can
 * never leave the screen invisible.
 */
export default function TabFocusFade({ children }: { children: ReactNode }) {
  const opacity = useSharedValue(1);
  const lift = useSharedValue(0);

  useFocusEffect(useCallback(() => {
    opacity.value = 0.35;
    lift.value = 8;
    opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    lift.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [opacity, lift]));

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: lift.value }] }));
  return <Animated.View style={[{ flex: 1 }, style]}>{children}</Animated.View>;
}
