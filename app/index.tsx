import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useStore } from '@/store/useStore';
import { getSession } from '@/services/auth';
import LoadingScreen from '@/components/auth/LoadingScreen';

export default function Index() {
  const { user, setUser } = useStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await getSession();

        if (session?.user) {
          // 有有效 session，但本地可能没有 user 数据（app 被杀掉重启的情况）
          const localUser = useStore.getState().user;
          if (!localUser) {
            // 从 session 恢复基本用户信息
            setUser({
              id: session.user.id,
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
              email: session.user.email || '',
              hasCompletedOnboarding: session.user.user_metadata?.hasCompletedOnboarding || false,
            });
          }
        } else {
          // 没有有效 session，清除本地用户数据
          if (useStore.getState().user) {
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
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
