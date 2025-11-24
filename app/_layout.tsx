import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/hooks/useTheme';
import '../global.css';

// 设置全局默认字体
(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.style = { fontFamily: 'Nunito' };

export default function RootLayout() {
  const themeMode = useStore((state) => state.themeMode);
  const colors = useTheme();
  
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.backgroundPrimary,
          },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
    </>
  );
}


