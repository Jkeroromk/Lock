import { Tabs, usePathname, useSegments, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HardShadow, PressScale, MOTION } from '@/components/ui/bxc';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform, type ViewStyle } from 'react-native';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import * as Device from 'expo-device';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { useCalorieStatus, isWarning } from '@/lib/calorieStatus';
import { TAB_BAR_HEIGHT } from '@/hooks/useTabBarInset';
import { useDeviceLayout, RAIL_WIDTH, RAIL_MARGIN, RAIL_SPACE } from '@/hooks/useDeviceLayout';

// Props expo-router passes to a custom tab bar (taken from Tabs itself, so it
// follows whatever navigation library expo-router uses underneath).
type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

type LogVariant = 'raised' | 'rail' | 'fab';

/**
 * The yellow camera button. raised: sticks out of the phone tab bar; rail:
 * inside the outer-display rail; fab: on its own at the bottom right of the
 * open Duo, so it never sits on the fold.
 */
function LogTabButton(props: any) {
  const pathname = usePathname();
  const segments = useSegments();
  const router = useRouter();
  const { onPress, accessibilityState } = props;
  const variant: LogVariant = props.variant ?? 'raised';
  const { t } = useTranslation();
  const colors = useTheme();

  // 检测是否在log页面
  const isOnLogPage = pathname?.includes('/log') || segments?.includes('log') || false;
  const isSelected = isOnLogPage || (accessibilityState?.selected ?? false);

  // iOS simulator has no camera. Constants.isDevice no longer exists (it was
  // always undefined, so every phone was treated as a simulator); expo-device has it.
  const isIOSSimulator = Platform.OS === 'ios' && Device.isDevice === false;

  // Opens our own camera (拍照 · 扫码). The simulator has no camera: go to the log tab.
  const handlePress = () => {
    if (isIOSSimulator) {
      if (!isOnLogPage) onPress();
      return;
    }
    router.push('/camera');
  };

  const size = variant === 'rail' ? 50 : variant === 'fab' ? 64 : 62;
  const radius = variant === 'rail' ? 17 : variant === 'fab' ? 22 : 20;
  const wrapper: ViewStyle =
    variant === 'raised'
      ? { flex: 1, alignItems: 'center', justifyContent: 'center' }
      : variant === 'rail'
        ? { width: RAIL_WIDTH, height: 66, alignItems: 'center', justifyContent: 'center' }
        : { alignItems: 'center', justifyContent: 'center' };

  return (
    <PressScale
      onPress={handlePress}
      scaleTo={0.88}
      accessibilityRole="button"
      accessibilityLabel={t('tabs.log')}
      accessibilityState={{ selected: isSelected }}
      style={wrapper}
    >
      <View style={{ marginTop: variant === 'raised' ? -34 : 0, transform: [{ rotate: '-4deg' }] }}>
        <HardShadow color={colors.ink} radius={radius} offset={variant === 'rail' ? 3 : 4}>
          <View
            style={{
              width: size,
              height: size,
              borderRadius: radius,
              backgroundColor: colors.accent,
              borderWidth: 2,
              borderColor: colors.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={isSelected ? 'camera' : 'camera-outline'} size={variant === 'rail' ? 24 : 28} color={colors.onAccent} />
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

type Route = BottomTabBarProps['state']['routes'][number];

/** Press handler for a tab, same rules as the default tab bar. */
function useTabPress({ state, navigation }: BottomTabBarProps) {
  return (route: Route) => () => {
    const focused = state.routes[state.index]?.key === route.key;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name as never);
  };
}

/**
 * One tab icon. The phone bar draws its own sliding dot; the rail and the
 * open-Duo bar mark the active tab with a fixed yellow dot (left / below).
 */
function TabIcon({
  route, focused, onPress, label, overGoal, style, indicator,
}: {
  route: Route; focused: boolean; onPress: () => void; label: string; overGoal: boolean;
  style: ViewStyle; indicator?: 'left' | 'below';
}) {
  const colors = useTheme();
  const { t } = useTranslation();
  const icons = TAB_ICONS[route.name];
  if (!icons) return null;
  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.86}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={[label, route.name === 'today' && overGoal ? t('calorieWarn.tabBadge' as any) : ''].filter(Boolean).join(', ')}
      style={[{ alignItems: 'center', justifyContent: 'center' }, style]}
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
      {focused && indicator ? (
        <View
          pointerEvents="none"
          style={[
            { position: 'absolute', width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.accent },
            indicator === 'left' ? { left: 7, top: '50%', marginTop: -2.5 } : { bottom: 13, left: '50%', marginLeft: -2.5 },
          ]}
        />
      ) : null}
    </PressScale>
  );
}

function tabLabel(descriptors: BottomTabBarProps['descriptors'], route: Route) {
  const title = descriptors[route.key]?.options.title;
  return typeof title === 'string' ? title : route.name;
}

/**
 * Floating pill tab bar (B×C). Sits in the layout flow so screens need no extra
 * padding. The yellow dot slides to the active tab; icons squash on press.
 */
function PhoneTabBar(props: BottomTabBarProps & { maxWidth?: number }) {
  const { state, descriptors, maxWidth } = props;
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const pressFor = useTabPress(props);
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
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16,
        paddingBottom: Math.max(insets.bottom, 12), alignItems: 'center',
      }}
    >
      <View
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        style={{
          width: '100%',
          maxWidth,
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
          if (route.name === 'log') {
            return <LogTabButton key={route.key} onPress={pressFor(route)} accessibilityState={{ selected: focused }} />;
          }
          return (
            <TabIcon
              key={route.key}
              route={route}
              focused={focused}
              onPress={pressFor(route)}
              label={tabLabel(descriptors, route)}
              overGoal={overGoal}
              style={{ flex: 1, height: 66, paddingBottom: 8 }}
            />
          );
        })}
      </View>
    </View>
  );
}

/**
 * iPhone Duo outer display: the same pill, standing up along the right edge
 * where the right thumb rests. The camera stays in the middle.
 */
function RailTabBar(props: BottomTabBarProps) {
  const { state, descriptors } = props;
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const pressFor = useTabPress(props);
  const overGoal = isWarning(useCalorieStatus().level);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute', top: 0, bottom: 0, right: 0,
        width: RAIL_SPACE + insets.right,
        paddingRight: Math.max(insets.right, RAIL_MARGIN),
        alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <View style={{ width: RAIL_WIDTH, borderRadius: RAIL_WIDTH / 2, backgroundColor: colors.tabBar, paddingVertical: 6, alignItems: 'center' }}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          if (route.name === 'log') {
            return <LogTabButton key={route.key} variant="rail" onPress={pressFor(route)} accessibilityState={{ selected: focused }} />;
          }
          return (
            <TabIcon
              key={route.key}
              route={route}
              focused={focused}
              onPress={pressFor(route)}
              label={tabLabel(descriptors, route)}
              overGoal={overGoal}
              indicator="left"
              style={{ width: RAIL_WIDTH, height: 62 }}
            />
          );
        })}
      </View>
    </View>
  );
}

const ISLAND_SLOT = 64;
const ISLAND_PAD = 6;
const LEFT_TABS = ['today', 'train'];
const RIGHT_TABS = ['dashboard', 'settings'];

/**
 * iPhone Duo open: one pill across the middle with two tabs on each side, so
 * the fold falls between tabs and nothing tappable sits on it. Folded part-way
 * like a book, the pill splits at the fold into two islands that slide to the
 * middle of their half. The camera is its own button at the bottom right.
 */
function InnerTabBar(props: BottomTabBarProps) {
  const { state, descriptors } = props;
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const pressFor = useTabPress(props);
  const overGoal = isWarning(useCalorieStatus().level);
  const { width, fold, book } = useDeviceLayout();

  const H = TAB_BAR_HEIGHT;
  const bottom = Math.max(insets.bottom, 12);
  const base = ISLAND_PAD * 2 + ISLAND_SLOT * 2;
  const half = (fold?.width ?? 24) / 2;
  const center = width / 2;
  const leftCenter = (fold ? fold.start : center - half) / 2;
  const rightCenter = width - leftCenter;

  const split = useSharedValue(book ? 1 : 0);
  useEffect(() => {
    split.value = withSpring(book ? 1 : 0, MOTION.slide);
  }, [book]);

  // Flat: each island reaches the middle, inner corners square, so the two
  // read as one pill. Book: inner corners round, each centred in its half.
  const leftStyle = useAnimatedStyle(() => {
    const s = split.value;
    const w = base + half * (1 - s);
    return {
      width: w,
      left: (center - w) * (1 - s) + (leftCenter - base / 2) * s,
      borderTopRightRadius: (H / 2) * s,
      borderBottomRightRadius: (H / 2) * s,
    };
  });
  const rightStyle = useAnimatedStyle(() => {
    const s = split.value;
    const w = base + half * (1 - s);
    return {
      width: w,
      left: center * (1 - s) + (rightCenter - base / 2) * s,
      borderTopLeftRadius: (H / 2) * s,
      borderBottomLeftRadius: (H / 2) * s,
    };
  });

  const renderTabs = (names: string[]) =>
    state.routes
      .filter((route) => names.includes(route.name))
      .map((route) => (
        <TabIcon
          key={route.key}
          route={route}
          focused={state.routes[state.index]?.key === route.key}
          onPress={pressFor(route)}
          label={tabLabel(descriptors, route)}
          overGoal={overGoal}
          indicator="below"
          style={{ width: ISLAND_SLOT, height: H, paddingBottom: 8 }}
        />
      ));

  const logRoute = state.routes.find((r) => r.name === 'log');
  const island: ViewStyle = {
    position: 'absolute', top: 0, height: H, backgroundColor: colors.tabBar,
    borderRadius: H / 2, flexDirection: 'row', alignItems: 'center', paddingHorizontal: ISLAND_PAD,
  };

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: H + bottom }}>
      <Animated.View style={[island, { justifyContent: 'flex-start' }, leftStyle]}>{renderTabs(LEFT_TABS)}</Animated.View>
      <Animated.View style={[island, { justifyContent: 'flex-end' }, rightStyle]}>{renderTabs(RIGHT_TABS)}</Animated.View>
      {logRoute ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', top: 1, right: Math.max(insets.right, 16) + 12 }}>
          <LogTabButton
            variant="fab"
            onPress={pressFor(logRoute)}
            accessibilityState={{ selected: state.routes[state.index]?.key === logRoute.key }}
          />
        </View>
      ) : null}
    </View>
  );
}

function AdaptiveTabBar(props: BottomTabBarProps) {
  const { kind } = useDeviceLayout();
  if (kind === 'outer') return <RailTabBar {...props} />;
  if (kind === 'inner') return <InnerTabBar {...props} />;
  if (kind === 'wide') return <PhoneTabBar {...props} maxWidth={460} />;
  return <PhoneTabBar {...props} />;
}

export default function TabLayout() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { kind } = useDeviceLayout();

  return (
    <Tabs
      tabBar={(props) => <AdaptiveTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Tabs mount on first visit. Mounting all five at launch fired every
        // screen's network requests at once and slowed startup.
        lazy: true,
        // No navigator transition: 'shift' could be interrupted by fast tab
        // switching and leave a blank screen. Each tab fades in itself
        // (components/ui/TabFocusFade), which always ends fully visible.
        animation: 'none',
        // Outer display: keep content clear of the tab rail on the right.
        sceneStyle: kind === 'outer' ? { paddingRight: RAIL_SPACE, backgroundColor: colors.backgroundPrimary } : undefined,
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: t('tabs.today'),
        }}
      />
      <Tabs.Screen
        name="train"
        options={{
          title: t('tabs.train'),
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
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.user'),
        }}
      />
    </Tabs>
  );
}
