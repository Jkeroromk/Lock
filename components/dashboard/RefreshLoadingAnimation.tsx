import { View, Animated, Easing } from 'react-native';
import { useEffect, useRef } from 'react';
import { DIMENSIONS } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

interface RefreshLoadingAnimationProps {
  visible: boolean;
}

export default function RefreshLoadingAnimation({ visible }: RefreshLoadingAnimationProps) {
  const colors = useTheme();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // 重置旋转动画值
      rotateAnim.setValue(0);
      
      // 淡入动画
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();

      // 旋转动画 - 持续循环
      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        { iterations: -1 }
      );
      rotate.start();

      return () => {
        rotate.stop();
        rotateAnim.setValue(0);
      };
    } else {
      // 淡出动画
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        // 动画完成后重置旋转值
        rotateAnim.setValue(0);
      });
    }
  }, [visible]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        opacity: opacityAnim,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: visible ? DIMENSIONS.SPACING * 1.2 : 0,
        marginBottom: visible ? DIMENSIONS.SPACING * 0.8 : 0,
        height: visible ? undefined : 0,
        overflow: 'hidden',
      }}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Animated.View
        style={{
          width: DIMENSIONS.SCREEN_WIDTH * 0.12,
          height: DIMENSIONS.SCREEN_WIDTH * 0.12,
          borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.06,
          borderWidth: 3,
          borderColor: colors.textPrimary,
          borderTopColor: 'transparent',
          borderRightColor: 'transparent',
          transform: [{ rotate: rotateInterpolate }],
        }}
      />
    </Animated.View>
  );
}

