import { Tabs, usePathname, useSegments, useRouter } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HardShadow, PressScale, MOTION } from '@/components/ui/bxc';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useEffect, useRef, useState } from 'react';
import Constants from 'expo-constants';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { useCalorieStatus, isWarning } from '@/lib/calorieStatus';
import { TAB_BAR_HEIGHT } from '@/hooks/useTabBarInset';

function LogTabButton(props: any) {
  const pathname = usePathname();
  const segments = useSegments();
  const router = useRouter();
  const { onPress, accessibilityState } = props;
  const { t } = useTranslation();
  const colors = useTheme();
  
  // 检测是否在log页面
  const isOnLogPage = pathname?.includes('/log') || segments?.includes('log') || false;
  const isSelected = isOnLogPage || (accessibilityState?.selected ?? false);
  
  // 检测是否为iOS模拟器（模拟器上Constants.isDevice为false）
  const isIOSSimulator = Platform.OS === 'ios' && !Constants.isDevice;
  
  // Opens our own camera (拍照 · 扫码). The simulator has no camera: go to the log tab.
  const handlePress = () => {
    if (isIOSSimulator) {
      if (!isOnLogPage) onPress();
      return;
    }
    router.push('/camera');
  };

  return (
    <PressScale
      onPress={handlePress}
      scaleTo={0.88}
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
  train: { on: 'barbell', off: 'barbell-outline' },
  dashboard: { on: 'people', off: 'people-outline' },
  settings: { on: 'person', off: 'person-outline' },
};

/**
 * Floating pill tab bar (B×C). Sits in the layout flow so screens need no extra
 * padding. The yellow dot slides to the active tab; icons squash on press.
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

  return (
    // Floats over the screen: only the pill is drawn, content scrolls behind it
    // (screens pad their scroll content with useTabBarInset).
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <View
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        style={{
          height: TAB_BAR_HEIGHT,
          borderRadius: TAB_BAR_HEIGHT / 2,
          backgroundColor: colors.tabBar,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: PAD,
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', left: 0, bottom: 13, width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.accent }, dotStyle]}
        />
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
        name="train"
        options={{
          title: t('tabs.train'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell" size={size} color={color} />
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
