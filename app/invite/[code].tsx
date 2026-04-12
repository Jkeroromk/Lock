/**
 * 深链接入口：lock://invite/ABCDEF
 * Expo Router 自动将该 URL 映射到此文件。
 * 跳转到 Dashboard 并预填邀请码，自动打开"添加好友"弹窗。
 */
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';

export default function InviteDeepLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (code) {
      if (isSignedIn) {
        // 已登录 → 直接跳到 Dashboard，带邀请码参数
        router.replace({ pathname: '/(tabs)/dashboard', params: { inviteCode: code } });
      } else {
        // 未登录 → 先去登录，登录后回到 Dashboard
        router.replace({ pathname: '/(auth)/login', params: { inviteCode: code } });
      }
    }
  }, [code, isSignedIn]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
