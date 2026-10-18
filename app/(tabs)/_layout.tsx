import { Tabs, usePathname, useSegments, useRouter } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HardShadow, PressScale } from '@/components/ui/bxc';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { View, Alert, Platform } from 'react-native';
import { Text } from '@/components/ui/Text';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { useCalorieStatus, isWarning } from '@/lib/calorieStatus';
import { useGameNavHidden } from '@/lib/game/navSignal';

function LogTabButton(props: any) {
  const pathname = usePathname();
  const segments = useSegments();
  const router = useRouter();
  const { onPress, accessibilityState, label, labelColor, labelShadow } = props;
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
    <PressScale
      onPress={handlePress}
      scaleTo={0.88}
      disabled={isOpeningCamera}
      accessibilityRole="button"
      accessibilityLabel={t('tabs.log')}
      accessibilityState={{ selected: isSelected }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{ marginTop: label ? -44 : -34, transform: [{ rotate: '-4deg' }] }}>
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
      {label ? (
        <Text numberOfLines={1} style={[{ fontSize: 11, fontWeight: isSelected ? '800' : '600', color: labelColor, marginTop: 2 }, labelShadow]}>{label}</Text>
      ) : null}
    </PressScale>
  );
}

const TAB_ICONS: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }> = {
  today: { on: 'today', off: 'today-outline' },
  partner: { on: 'egg', off: 'egg-outline' },
  dashboard: { on: 'people', off: 'people-outline' },
  settings: { on: 'person', off: 'person-outline' },
};

const TAB_LABELS: Record<string, string> = { today: 'tabs.today', partner: 'tabs.partner', log: 'tabs.log', dashboard: 'tabs.social', settings: 'tabs.user' };
const GAME_SHADOW = { textShadowColor: 'rgba(10, 12, 24, 0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 };

/**
 * Game-menu tab bar: icons with labels floating on the page (no bar behind
 * them); the active tab sits on a yellow sticker like the camera button. It
 * stays in the layout flow so screens need no extra padding — except on the
 * Buddy tab, where it floats over the full-screen game in light colours and
 * steps aside while a scene plays.
 */
function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  // Red dot on Today while over the calorie goal, visible from every tab.
  const overGoal = isWarning(useCalorieStatus().level);
  const activeName = state.routes[state.index]?.name;

  const overGame = activeName === 'partner';
  const sceneOn = useGameNavHidden() && overGame;
  const fade = useSharedValue(1);
  useEffect(() => { fade.value = withTiming(sceneOn ? 0 : 1, { duration: 180 }); }, [sceneOn]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  const idle = overGame ? '#ffffff' : colors.textSecondary;
  const labelOn = overGame ? '#ffd43b' : colors.textPrimary;
  const shadow = overGame ? GAME_SHADOW : null;

  return (
    <Animated.View
      pointerEvents={sceneOn ? 'none' : 'box-none'}
      style={[
        { paddingHorizontal: 12, paddingTop: 30, paddingBottom: Math.max(insets.bottom, 12) },
        overGame
          ? { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'transparent' }
          : { backgroundColor: colors.backgroundPrimary },
        fadeStyle,
      ]}
    >
      <View style={{ height: 66, flexDirection: 'row', alignItems: 'center' }}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name as never);
          };
          const label = t(TAB_LABELS[route.name] as any);

          if (route.name === 'log') {
            return <LogTabButton key={route.key} onPress={onPress} accessibilityState={{ selected: focused }} label={label} labelColor={focused ? labelOn : idle} labelShadow={shadow} />;
          }

          const icons = TAB_ICONS[route.name];
          if (!icons) return null;
          return (
            <PressScale
              key={route.key}
              onPress={onPress}
              scaleTo={0.86}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={[
                typeof options.title === 'string' ? options.title : route.name,
                route.name === 'today' && overGoal ? t('calorieWarn.tabBadge' as any) : '',
              ].filter(Boolean).join(', ')}
              style={{ flex: 1, height: 66, alignItems: 'center', justifyContent: 'center', gap: 3 }}
            >
              <View style={{ width: 44, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                {focused ? (
                  <View style={{ position: 'absolute', left: 0, top: 0, transform: [{ rotate: '-3deg' }] }}>
                    <HardShadow color={colors.ink} radius={12} offset={2}>
                      <View style={{ width: 42, height: 30, borderRadius: 12, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.ink }} />
                    </HardShadow>
                  </View>
                ) : null}
                <Ionicons
                  name={focused ? icons.on : icons.off}
                  size={focused ? 20 : 24}
                  color={focused ? colors.onAccent : idle}
                  style={focused ? undefined : shadow ?? undefined}
                />
                {route.name === 'today' && overGoal ? (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute', top: -2, right: 0, width: 11, height: 11, borderRadius: 6,
                      backgroundColor: colors.danger, borderWidth: 2, borderColor: overGame ? '#141626' : colors.backgroundPrimary,
                    }}
                  />
                ) : null}
              </View>
              <Text numberOfLines={1} style={[{ fontSize: 11, fontWeight: focused ? '800' : '600', color: focused ? labelOn : idle }, shadow]}>{label}</Text>
            </PressScale>
          );
        })}
      </View>
    </Animated.View>
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
        // Tabs mount on first visit. Mounting all five at launch fired every
        // screen's network requests at once and slowed startup.
        lazy: true,
        // No navigator transition: 'shift' could be interrupted by fast tab
        // switching and leave a blank screen. Each tab fades in itself
        // (components/ui/TabFocusFade), which always ends fully visible.
        animation: 'none',
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
        name="partner"
        options={{
          title: t('tabs.partner' as any),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="egg" size={size} color={color} />
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
