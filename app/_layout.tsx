import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, Platform } from 'react-native';
import { useEffect } from 'react';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/hooks/useTheme';
import { setTokenGetter } from '@/services/tokenStore';
import { initRevenueCat, identifyUser, resetUser } from '@/lib/revenuecat';
import { registerAndSavePushToken } from '@/services/notifications';
import '../global.css';

// 启用原生屏幕管理，减少内存占用并提升导航性能
enableScreens(true);

// 初始化 RevenueCat（App 启动时只执行一次）
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  initRevenueCat(Platform.OS);
}

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

// SecureStore token cache for Clerk
const tokenCache = {
  async getToken(key: string) {
    try { return await SecureStore.getItemAsync(key); } catch { return null; }
  },
  async saveToken(key: string, value: string) {
    try { await SecureStore.setItemAsync(key, value); } catch {}
  },
  async clearToken(key: string) {
    try { await SecureStore.deleteItemAsync(key); } catch {}
  },
};

// Bridges Clerk's getToken into the token store, and wires RevenueCat user identity
function ClerkTokenBridge() {
  const { getToken, isSignedIn, userId } = useAuth();

  useEffect(() => {
    setTokenGetter(isSignedIn ? getToken : null);
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (isSignedIn && userId) {
      identifyUser(userId);
      // 登录后注册推送令牌（异步，不阻塞 UI）
      registerAndSavePushToken().catch(() => {});
    } else if (isSignedIn === false) {
      // Only reset when explicitly signed out, not while Clerk is still loading
      resetUser();
    }
  }, [isSignedIn, userId]);

  return null;
}

// Sets global default font
(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.style = { fontFamily: 'Nunito' };

export default function RootLayout() {
  const themeMode = useStore((state) => state.themeMode);
  const colors = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <ClerkTokenBridge />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.backgroundPrimary },
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
