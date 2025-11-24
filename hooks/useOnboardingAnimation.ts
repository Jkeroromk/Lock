import { useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring, 
  withSequence,
  withDelay,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { useStore, Gender, Goal, ExerciseFrequency, ExpectedTimeframe } from '@/store/useStore';

interface OnboardingData {
  height: number;
  age: number;
  weight: number;
  gender: Gender | null;
  goal: Goal | null;
  exerciseFrequency: ExerciseFrequency | null;
  expectedTimeframe: ExpectedTimeframe | null;
}

interface UseOnboardingAnimationProps {
  user: any;
  setUser: (user: any) => void;
  setLockState: (state: 'open' | 'closed') => void;
  onboardingData: OnboardingData;
}

export function useOnboardingAnimation({
  user,
  setUser,
  setLockState,
  onboardingData,
}: UseOnboardingAnimationProps) {
  const router = useRouter();
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  // 动画值
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.8);
  const lockScale = useSharedValue(0);
  const lockRotation = useSharedValue(0);
  const openLockOpacity = useSharedValue(1);
  const closedLockOpacity = useSharedValue(0);

  // 动画样式
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: scaleAnim.value }],
  }));

  const lockContainerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: lockScale.value },
      {
        rotate: `${lockRotation.value * 15}deg`,
      },
    ],
  }));

  const openLockAnimatedStyle = useAnimatedStyle(() => ({
    opacity: openLockOpacity.value,
  }));

  const closedLockAnimatedStyle = useAnimatedStyle(() => ({
    opacity: closedLockOpacity.value,
  }));

  // 清理定时器
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeout) => {
        if (timeout) {
          clearTimeout(timeout);
        }
      });
      timeoutRefs.current = [];
    };
  }, []);

  // 导航到主页
  const navigateToHome = useCallback(() => {
    try {
      router.replace('/(tabs)/today');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [router]);

  // 完成动画后的处理
  const handleAnimationComplete = useCallback(() => {
    setLockState('closed');
    
    if (user) {
      setUser({
        ...user,
        height: onboardingData.height,
        age: onboardingData.age,
        weight: onboardingData.weight,
        gender: onboardingData.gender || undefined,
        goal: onboardingData.goal || undefined,
        exerciseFrequency: onboardingData.exerciseFrequency || undefined,
        expectedTimeframe: onboardingData.expectedTimeframe || undefined,
        hasCompletedOnboarding: true,
      });
    }

    // 立即跳转，动画已经完成
    navigateToHome();
  }, [user, onboardingData, setUser, setLockState, navigateToHome]);

  // 启动 lock in 动画（在 JS 线程中执行）
  const startLockInAnimation = useCallback(() => {
    // 3. 执行 lock in 动画 - 总时长约 600ms
    lockRotation.value = withSequence(
      // 旋转到15度 (200ms)
      withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) }),
      // 旋转回0并完成 (400ms)
      withTiming(0, { 
        duration: 400, 
        easing: Easing.in(Easing.ease) 
      }, () => {
        runOnJS(handleAnimationComplete)();
      })
    );
    
    // 4. 透明度动画 (500ms) - 与旋转同时进行
    openLockOpacity.value = withDelay(200, withTiming(0, { 
      duration: 500, 
      easing: Easing.inOut(Easing.ease) 
    }));
    closedLockOpacity.value = withDelay(200, withTiming(1, { 
      duration: 500, 
      easing: Easing.inOut(Easing.ease) 
    }));
  }, [lockRotation, openLockOpacity, closedLockOpacity, handleAnimationComplete]);

  // 调度 lock in 动画（在 JS 线程中执行）
  const scheduleLockIn = useCallback(() => {
    const timeout2 = setTimeout(() => {
      startLockInAnimation();
    }, 200); // 短暂延迟，让用户看到锁图标
    timeoutRefs.current.push(timeout2);
  }, [startLockInAnimation]);

  // 启动完成动画 - 总时长控制在 1.5 秒
  const startCompletionAnimation = () => {
    // 重置所有动画值
    fadeAnim.value = 0;
    scaleAnim.value = 0.8;
    lockScale.value = 0;
    lockRotation.value = 0;
    openLockOpacity.value = 1;
    closedLockOpacity.value = 0;

    // 总动画时间控制在 1.5 秒
    // 1. 主容器淡入和缩放 (300ms)
    fadeAnim.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
    scaleAnim.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });

    // 2. 锁图标缩放显示 (400ms) - 延迟开始
    const timeout1 = setTimeout(() => {
      lockScale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }, () => {
        // worklet 回调中不能直接修改 ref，使用 runOnJS 在 JS 线程中执行
        runOnJS(scheduleLockIn)();
      });
    }, 200); // 延迟显示锁图标
    timeoutRefs.current.push(timeout1);
  };

  return {
    containerAnimatedStyle,
    lockContainerAnimatedStyle,
    openLockAnimatedStyle,
    closedLockAnimatedStyle,
    startCompletionAnimation,
  };
}

