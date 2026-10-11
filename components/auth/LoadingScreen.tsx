import { useEffect } from 'react';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, Easing, FadeIn,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import BootSplash from '@/components/ui/BootSplash';
import { FONTS } from '@/constants/fonts';
import { useTranslation } from '@/i18n';

const ACCENT = '#FFD43B';
const MUTED = '#8C8B86';

/**
 * Shown while auth / profile load. It is the launch screen plus a small yellow
 * progress track under the mark, so there is no visual jump from the native splash.
 * The track only fades in after a beat, so fast launches never see it.
 */
export default function LoadingScreen({ hint }: { hint?: string } = {}) {
  const { t } = useTranslation();
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withDelay(400, withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) }), -1, true));
  }, [x]);

  const bar = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 56 }] }));

  return (
    <BootSplash>
      <Animated.View entering={FadeIn.delay(500).duration(400)} style={{ alignItems: 'center' }}>
        <Animated.View style={{ width: 84, height: 6, borderRadius: 3, backgroundColor: '#262626', overflow: 'hidden' }}>
          <Animated.View style={[{ width: 28, height: 6, borderRadius: 3, backgroundColor: ACCENT }, bar]} />
        </Animated.View>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: MUTED, marginTop: 14, textTransform: 'uppercase' }}>
          {t('common.loading')}
        </Text>
        {hint ? (
          <Text style={{ fontSize: 14, lineHeight: 20, color: MUTED, marginTop: 10, paddingHorizontal: 40, textAlign: 'center' }}>
            {hint}
          </Text>
        ) : null}
      </Animated.View>
    </BootSplash>
  );
}
