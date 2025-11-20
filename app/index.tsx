import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useStore } from '@/store/useStore';
import LoadingScreen from '@/components/auth/LoadingScreen';

export default function Index() {
  const { user } = useStore();
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

  // 如果用户已登录，跳转到主应用
  if (user) {
    return <Redirect href="/(tabs)/today" />;
  }

  // 如果用户未登录，跳转到登录页面
  return <Redirect href="/(auth)/login" />;
}
