import { View, Text, Animated, Easing } from 'react-native';
import { useEffect, useRef } from 'react';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

export default function LoadingScreen() {
  const colors = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 脉冲动画
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // 旋转动画
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    pulse.start();
    rotate.start();

    return () => {
      pulse.stop();
      rotate.stop();
    };
  }, []);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View 
      style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: colors.backgroundPrimary,
      }}
    >
      {/* 现代化的加载动画 */}
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={{
            width: DIMENSIONS.SCREEN_WIDTH * 0.15,
            height: DIMENSIONS.SCREEN_WIDTH * 0.15,
            borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.075,
            backgroundColor: colors.textPrimary,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: pulseAnim }],
            shadowColor: colors.textPrimary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          <Animated.View
            style={{
              width: DIMENSIONS.SCREEN_WIDTH * 0.12,
              height: DIMENSIONS.SCREEN_WIDTH * 0.12,
              borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.06,
              borderWidth: 3,
              borderColor: colors.backgroundPrimary,
              borderTopColor: 'transparent',
              transform: [{ rotate: rotateInterpolate }],
            }}
          />
        </Animated.View>
        
        <Text 
          style={{ 
            fontSize: TYPOGRAPHY.bodyS,
            fontWeight: '600',
            color: colors.textPrimary,
            marginTop: DIMENSIONS.SPACING * 1.5,
            opacity: 0.8,
            letterSpacing: 1,
          }}
        >
          Loading...
        </Text>
      </View>
    </View>
  );
}

