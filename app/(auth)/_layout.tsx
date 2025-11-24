import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // 移除硬编码背景色，让每个页面自己设置背景色
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="language-selection" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}

