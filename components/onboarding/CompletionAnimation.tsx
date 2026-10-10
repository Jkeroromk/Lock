import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

interface CompletionAnimationProps {
  containerAnimatedStyle: any;
  lockContainerAnimatedStyle: any;
  openLockAnimatedStyle: any;
  closedLockAnimatedStyle: any;
}

export default function CompletionAnimation({
  containerAnimatedStyle,
  lockContainerAnimatedStyle,
  openLockAnimatedStyle,
  closedLockAnimatedStyle,
}: CompletionAnimationProps) {
  const { t } = useTranslation();
  const colors = useTheme();

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.backgroundPrimary,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        },
        containerAnimatedStyle,
      ]}
    >
      <Animated.View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Lock in 图标 - 从开锁到锁上 */}
        <Animated.View
          style={[
            {
              width: DIMENSIONS.SCREEN_WIDTH * 0.2,
              height: DIMENSIONS.SCREEN_WIDTH * 0.2,
              borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.06,
              backgroundColor: colors.accent,
              borderWidth: 3,
              borderColor: colors.ink,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: DIMENSIONS.SPACING * 1.5,
              shadowColor: colors.cardShadow,
              shadowOffset: { width: 6, height: 6 },
              shadowOpacity: 1,
              shadowRadius: 0,
            },
            lockContainerAnimatedStyle,
          ]}
        >
          {/* 开锁图标 */}
          <Animated.View
            style={[
              {
                position: 'absolute',
              },
              openLockAnimatedStyle,
            ]}
            pointerEvents="none"
          >
            <Ionicons name="lock-open" size={DIMENSIONS.SCREEN_WIDTH * 0.11} color={colors.onAccent} />
          </Animated.View>
          
          {/* 锁上图标 */}
          <Animated.View
            style={[
              {
                position: 'absolute',
              },
              closedLockAnimatedStyle,
            ]}
            pointerEvents="none"
          >
            <Ionicons name="lock-closed" size={DIMENSIONS.SCREEN_WIDTH * 0.11} color={colors.onAccent} />
          </Animated.View>
        </Animated.View>
        
        {/* 完成文本 */}
        <Text
          style={{
            fontSize: 44,
            fontWeight: '800',
            letterSpacing: -1.8,
            color: colors.textPrimary,
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          {t('onboarding.lockedIn')}
        </Text>
        <Text
          style={{
            fontSize: TYPOGRAPHY.bodyS,
            fontWeight: '500',
            color: colors.textPrimary,
            opacity: 0.7,
            textAlign: 'center',
          }}
        >
          {t('onboarding.settingUp')}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}


