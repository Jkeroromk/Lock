import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Platform } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { FONT_FILES } from '@/constants/fonts';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { resourceCache } from '@clerk/clerk-expo/resource-cache';
import * as SecureStore from 'expo-secure-store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastHost } from '@/components/ui/Toast';
import UpdateNotifier from '@/components/UpdateNotifier';
import { enableScreens } from 'react-native-screens';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/hooks/useTheme';
import { setTokenGetter } from '@/services/tokenStore';
import { initRevenueCat, identifyUser, resetUser } from '@/lib/revenuecat';
import { registerAndSavePushToken } from '@/services/notifications';
import BootSplash from '@/components/ui/BootSplash';
import '../global.css';

// 启用原生屏幕管理，减少内存占用并提升导航性能
enableScreens(true);

// 初始化 RevenueCat（App 启动时只执行一次）
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  initRevenueCat(Platform.OS);
}

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

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


export default function RootLayout() {
  const themeMode = useStore((state) => state.themeMode);
  const colors = useTheme();
  // Fonts are bundled locally, so this resolves almost immediately. If loading
  // ever fails we still render (system font) rather than block the app.
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);

  // Without a publishable key Clerk never finishes loading and the app sits on
  // the loading screen forever. Show the problem instead.
  if (!PUBLISHABLE_KEY) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#000' }}>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
          Configuration error: EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is missing from this build.
        </Text>
      </View>
    );
  }

  // Same picture as the native launch screen, so the hand-off is seamless.
  if (!fontsLoaded && !fontError) {
    return <BootSplash />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* resourceCache: Clerk starts from its last known state instead of waiting
          on the network, so signed-in launches don't block on a round-trip. */}
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} tokenCache={tokenCache} __experimental_resourceCache={resourceCache}>
        <ClerkTokenBridge />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.backgroundPrimary },
            animation: 'fade',
            animationDuration: 280,
          }}
        >
          <Stack.Screen name="index" options={{ animation: 'none' }} />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="calendar" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="workout/session" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="workout/plan" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="workout/done" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="pet/setup" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="pet/collection" options={{ animation: 'slide_from_right' }} />
        </Stack>
        <ToastHost />
        <UpdateNotifier />
        <StatusBar style={colors.backgroundPrimary === '#0A0A0A' ? 'light' : 'dark'} />
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
