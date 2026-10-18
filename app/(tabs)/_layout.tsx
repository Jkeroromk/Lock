import { Tabs, usePathname, useSegments, useRouter } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HardShadow, PressScale, MOTION } from '@/components/ui/bxc';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { View, Alert, Platform } from 'react-native';
import { Text } from '@/components/ui/Text';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import Constants from 'expo-constants';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { useCalorieStatus, isWarning } from '@/lib/calorieStatus';
import { useGameNavHidden } from '@/lib/game/navSignal';

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
    <PressScale
      onPress={handlePress}
      scaleTo={0.88}
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
    </PressScale>
  );
}

const TAB_ICONS: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }> = {
  today: { on: 'today', off: 'today-outline' },
  partner: { on: 'egg', off: 'egg-outline' },
  dashboard: { on: 'people', off: 'people-outline' },
  settings: { on: 'person', off: 'person-outline' },
};

const TAB_LABELS: Record<string, string> = { today: 'tabs.today', partner: 'tabs.partner', dashboard: 'tabs.social', settings: 'tabs.user' };

/**
 * Floating pill tab bar (B×C). Sits in the layout flow so screens need no extra
 * padding. The yellow dot slides to the active tab; icons squash on press.
 *
 * On the Buddy tab the game fills the whole screen, so the bar floats over it
 * like a game menu: no pill, light icons with labels, and it steps aside while
 * a scene plays.
 */
function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  // Red dot on Today while over the calorie goal, visible from every tab.
  const overGoal = isWarning(useCalorieStatus().level);
  const [barWidth, setBarWidth] = useState(0);
  const PAD = 6;
  const slot = barWidth > 0 ? (barWidth - PAD * 2) / state.routes.length : 0;
  const activeName = state.routes[state.index]?.name;
  const dotX = useSharedValue(0);
  const dotVisible = useSharedValue(0);
  const placed = useRef(false);

  useEffect(() => {
    if (!slot) return;
    const target = PAD + state.index * slot + slot / 2 - 2.5;
    if (!placed.current) { dotX.value = target; placed.current = true; }
    else dotX.value = withSpring(target, MOTION.slide);
    dotVisible.value = withTiming(activeName === 'log' ? 0 : 1, { duration: 160 });
  }, [state.index, slot, activeName]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: dotVisible.value, transform: [{ translateX: dotX.value }] }));

  const overGame = activeName === 'partner';
  const sceneOn = useGameNavHidden() && overGame;
  const fade = useSharedValue(1);
  useEffect(() => { fade.value = withTiming(sceneOn ? 0 : 1, { duration: 180 }); }, [sceneOn]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <Animated.View
      pointerEvents={sceneOn ? 'none' : 'box-none'}
      style={[
        { paddingHorizontal: 16, paddingTop: 30, paddingBottom: Math.max(insets.bottom, 12) },
        overGame
          ? { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'transparent' }
          : { backgroundColor: colors.backgroundPrimary },
        fadeStyle,
      ]}
    >
      <View
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        style={{
          height: 66,
          borderRadius: 33,
          backgroundColor: overGame ? 'transparent' : colors.tabBar,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: PAD,
        }}
      >
        {!overGame ? (
          <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', left: 0, bottom: 13, width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.accent }, dotStyle]}
          />
        ) : null}
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
          if (overGame) {
            return (
              <PressScale
                key={route.key}
                onPress={onPress}
                scaleTo={0.86}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={typeof options.title === 'string' ? options.title : route.name}
                style={{ flex: 1, height: 66, alignItems: 'center', justifyContent: 'center', gap: 2 }}
              >
                <View>
                  <Ionicons name={focused ? icons.on : icons.off} size={25} color={focused ? '#ffd43b' : '#ffffff'} style={GAME_SHADOW} />
                  {route.name === 'today' && overGoal ? (
                    <View pointerEvents="none" style={{ position: 'absolute', top: -3, right: -5, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger, borderWidth: 2, borderColor: '#141626' }} />
                  ) : null}
                </View>
                <Text style={[{ fontSize: 11, fontWeight: '800', color: focused ? '#ffd43b' : '#ffffff' }, GAME_SHADOW]}>{t(TAB_LABELS[route.name] as any)}</Text>
              </PressScale>
            );
          }
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
              style={{ flex: 1, height: 66, alignItems: 'center', justifyContent: 'center', paddingBottom: 8 }}
            >
              <View>
                <Ionicons
                  name={focused ? icons.on : icons.off}
                  size={23}
                  color={focused ? colors.tabIconActive : colors.tabIconInactive}
                />
                {route.name === 'today' && overGoal ? (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute', top: -3, right: -5, width: 10, height: 10, borderRadius: 5,
                      backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.tabBar,
                    }}
                  />
                ) : null}
              </View>
            </PressScale>
          );
        })}
      </View>
    </Animated.View>
  );
}

const GAME_SHADOW = { textShadowColor: 'rgba(10, 12, 24, 0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 };

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
