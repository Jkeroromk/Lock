import { View, Text } from 'react-native';
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
              borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.1,
              backgroundColor: colors.textPrimary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: DIMENSIONS.SPACING * 1.5,
              shadowColor: colors.textPrimary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
              elevation: 10,
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
            <Ionicons name="lock-open" size={DIMENSIONS.SCREEN_WIDTH * 0.12} color={colors.backgroundPrimary} />
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
            <Ionicons name="lock-closed" size={DIMENSIONS.SCREEN_WIDTH * 0.12} color={colors.backgroundPrimary} />
          </Animated.View>
        </Animated.View>
        
        {/* 完成文本 */}
        <Text
          style={{
            fontSize: TYPOGRAPHY.title,
            fontWeight: '900',
            color: colors.textPrimary,
            marginBottom: DIMENSIONS.SPACING * 0.4,
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


