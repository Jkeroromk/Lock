import { View, Animated, Easing } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useEffect, useRef } from 'react';
import { FONTS } from '@/constants/fonts';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';

export default function LoadingScreen({ hint }: { hint?: string } = {}) {
  const colors = useTheme();
  const { t } = useTranslation();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 脉冲动画
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
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
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.backgroundPrimary }}>
      <View style={{ width: 128, height: 128, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={{
            position: 'absolute', width: 128, height: 128, borderRadius: 64,
            borderWidth: 5, borderColor: colors.track, borderTopColor: colors.accent, borderRightColor: colors.accent,
            transform: [{ rotate: rotateInterpolate }],
          }}
        />
        <Animated.Image
          source={require('@/assets/icons/preview-open-lock.png')}
          style={{ width: 84, height: 84, borderRadius: 19, transform: [{ scale: pulseAnim }] }}
          accessibilityIgnoresInvertColors
        />
      </View>
      <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: colors.textSecondary, marginTop: 24, textTransform: 'uppercase' }}>
        {t('common.loading')}
      </Text>
      {hint ? (
        <Text style={{ fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginTop: 12, paddingHorizontal: 40, textAlign: 'center' }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
