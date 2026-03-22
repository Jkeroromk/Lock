import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { useEffect } from 'react';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/hooks/useTheme';
import '../global.css';

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

// Bridges Clerk's getToken into the Zustand store so services/api.ts can use it
function ClerkTokenBridge() {
  const { getToken, isSignedIn } = useAuth();
  const setGetToken = useStore((s) => s.setGetToken);

  useEffect(() => {
    setGetToken(isSignedIn ? getToken : null);
  }, [isSignedIn, getToken]);

  return null;
}

// Sets global default font
(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.style = { fontFamily: 'Nunito' };

export default function RootLayout() {
  const themeMode = useStore((state) => state.themeMode);
  const colors = useTheme();

  return (
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
  );
}
