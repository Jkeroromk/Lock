import { Tabs, usePathname, useSegments, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View, Text, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import Constants from 'expo-constants';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';

function LogTabButton(props: any) {
  const pathname = usePathname();
  const segments = useSegments();
  const router = useRouter();
  const { onPress, accessibilityState } = props;
  const [isOpeningCamera, setIsOpeningCamera] = useState(false);
  const { t } = useTranslation();
  const colors = useTheme();
  
  // 检测是否在log页面
  const isOnLogPage = pathname?.includes('/log') || segments?.includes('log') || false;
  const isSelected = isOnLogPage || (accessibilityState?.selected ?? false);
  
  // 检测是否为iOS模拟器（模拟器上Constants.isDevice为false）
  const isIOSSimulator = Platform.OS === 'ios' && !Constants.isDevice;
  
  // 选中时：主题文字色按钮 + 主题背景色边框 + 主题背景色图标
  // 未选中时：主题卡片背景色按钮 + 主题文字色边框 + 主题文字色图标
  const buttonBgColor = isSelected ? colors.textPrimary : colors.cardBackground;
  const borderColor = isSelected ? colors.backgroundPrimary : colors.textPrimary;
  const iconColor = isSelected ? colors.backgroundPrimary : colors.textPrimary;
  
  const handlePress = async () => {
    // 如果是iOS模拟器，只导航不打开相机
    if (isIOSSimulator) {
      if (!isOnLogPage) {
        onPress();
      }
      return;
    }
    
    // 立即打开相机（不等待导航）
    try {
      setIsOpeningCamera(true);
      
      // 先请求权限
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('需要权限', '我们需要访问相机以拍摄食物照片');
        setIsOpeningCamera(false);
        // 即使没有权限，也导航到log页面
        if (!isOnLogPage) {
          onPress();
        }
        return;
      }

      // 打开相机
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      // 如果拍照成功，导航到log页面并传递图片
      if (!result.canceled && result.assets[0]) {
        router.push({
          pathname: '/(tabs)/log',
          params: { imageUri: result.assets[0].uri },
        });
      } else {
        // 如果取消拍照，仍然导航到log页面（如果不在log页面）
        if (!isOnLogPage) {
          onPress();
        }
      }
    } catch (error: any) {
      // 捕获相机错误
      console.error('Error opening camera:', error);
      // 即使出错，也导航到log页面
      if (!isOnLogPage) {
        onPress();
      }
    } finally {
      setIsOpeningCamera(false);
    }
  };
  
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={isOpeningCamera}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 0,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: buttonBgColor,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isSelected ? 0.3 : 0.2,
          shadowRadius: 8,
          elevation: 8,
          borderWidth: 2,
          borderColor: borderColor,
          marginTop: -30,
          marginBottom: 4,
        }}
      >
        <Ionicons 
          name="camera" 
          size={28} 
          color={iconColor} 
        />
      </View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: colors.textPrimary,
          marginTop: 0,
        }}
      >
        {t('tabs.log')}
      </Text>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const colors = useTheme();
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.backgroundPrimary,
          borderTopWidth: 1,
          borderTopColor: colors.borderPrimary,
          height: 100,
          paddingBottom: 28,
          paddingTop: 12,
          paddingHorizontal: 18,
          elevation: 20,
          shadowColor: colors.shadowColor,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.5,
          shadowRadius: 12,
        },
        tabBarItemStyle: {
          paddingHorizontal: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 5,
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: t('tabs.today'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="today" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t('tabs.calendar'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: '',
          tabBarIcon: () => null, // 不在默认位置显示图标
          tabBarButton: LogTabButton,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('tabs.social'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.user'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
