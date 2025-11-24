import { useColorScheme } from 'react-native';
import { useStore } from '@/store/useStore';
import { lightTheme, darkTheme, Theme } from '@/constants/themes';

export function useTheme(): Theme {
  const themeMode = useStore((state) => state.themeMode);
  const systemColorScheme = useColorScheme();
  
  // 如果主题模式是 'auto'，使用系统设置
  const effectiveTheme = themeMode === 'auto' 
    ? (systemColorScheme === 'light' ? 'light' : 'dark')
    : themeMode;
  
  return effectiveTheme === 'light' ? lightTheme : darkTheme;
}

