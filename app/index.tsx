import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useStore } from '@/store/useStore';
import LoadingScreen from '@/components/auth/LoadingScreen';

export default function Index() {
  const { user, language } = useStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 模拟检查登录状态的延迟（实际应用中可能需要检查 token 等）
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  // 如果用户已登录，检查是否需要完成问卷调查
  if (user) {
    if (!user.hasCompletedOnboarding) {
      // 检查是否已选择语言
      const { hasSelectedLanguage } = useStore.getState();
      if (!hasSelectedLanguage) {
        return <Redirect href="/(auth)/language-selection" />;
      }
      return <Redirect href="/(auth)/onboarding" />;
    }
    return <Redirect href="/(tabs)/today" />;
  }

  // 如果用户未登录，跳转到登录页面
  return <Redirect href="/(auth)/login" />;
}
