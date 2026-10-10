import { Tabs, usePathname, useSegments, useRouter } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HardShadow } from '@/components/ui/bxc';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View, Alert, Platform } from 'react-native';
import { Text } from '@/components/ui/Text';
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
        Alert.alert(t('log.needPermission'), t('log.cameraPermissionDesc' as any));
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
      activeOpacity={0.85}
      disabled={isOpeningCamera}
      accessibilityRole="button"
      accessibilityLabel={t('tabs.log')}
      accessibilityState={{ selected: isSelected }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{ marginTop: -34, transform: [{ rotate: '-4deg' }] }}>
        <HardShadow color={colors.ink} radius={20} offset={4}>
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: 20,
              backgroundColor: colors.accent,
              borderWidth: 2,
              borderColor: colors.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={isSelected ? 'camera' : 'camera-outline'} size={28} color={colors.onAccent} />
          </View>
        </HardShadow>
      </View>
    </TouchableOpacity>
  );
}

const TAB_ICONS: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }> = {
  today: { on: 'today', off: 'today-outline' },
  calendar: { on: 'calendar', off: 'calendar-outline' },
  dashboard: { on: 'people', off: 'people-outline' },
  settings: { on: 'person', off: 'person-outline' },
};

/** Floating pill tab bar (B×C). Sits in the layout flow so screens need no extra padding. */
function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ backgroundColor: colors.backgroundPrimary, paddingHorizontal: 16, paddingTop: 30, paddingBottom: Math.max(insets.bottom, 12) }}>
      <View
        style={{
          height: 66,
          borderRadius: 33,
          backgroundColor: colors.tabBar,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 6,
        }}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name as never);
          };

          if (route.name === 'log') {
            return <LogTabButton key={route.key} onPress={onPress} accessibilityState={{ selected: focused }} />;
          }

          const icons = TAB_ICONS[route.name];
          if (!icons) return null;
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={typeof options.title === 'string' ? options.title : route.name}
              style={{ flex: 1, height: 66, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons
                name={focused ? icons.on : icons.off}
                size={23}
                color={focused ? colors.tabIconActive : colors.tabIconInactive}
              />
              <View
                style={{
                  marginTop: 5, width: 5, height: 5, borderRadius: 2.5,
                  backgroundColor: focused ? colors.accent : 'transparent',
                }}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const colors = useTheme();
  
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: false,
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
