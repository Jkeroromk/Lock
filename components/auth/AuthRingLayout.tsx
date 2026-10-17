import { useEffect, useState, type ReactNode } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import Animated, {
  Easing, Extrapolation, interpolate, interpolateColor,
  useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/hooks/useTheme';

const INK = '#0A0A0A';
const ACCENT = '#FFD43B';
const PAPER = '#F2F1EC';
const EASE = Easing.bezier(0.2, 0.9, 0.25, 1);
const DURATION = 720;
const HANDLE_SPACE = 26;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Log in / sign up stage ("Ring" design).
 * Log in: ink screen, the yellow ring almost closed. Sign up: the screen floods
 * yellow, the ring drains to a short starting arc and shrinks, and the sheet grows
 * to fit the sign-up form, which rises in from below while the other sinks away.
 */
export function AuthRingLayout({ signUp, captionLogin, captionSignup, login, signup, footer }: {
  signUp: boolean;
  captionLogin: string;
  captionSignup: string;
  login: ReactNode;
  signup: ReactNode;
  footer?: ReactNode;
}) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { height: H } = useWindowDimensions();

  // Ring scales with the screen so small phones keep room for the form.
  const ring = Math.round(Math.max(128, Math.min(220, H * 0.26)));
  const stroke = Math.round(ring * 0.082);
  const r = (ring - stroke) / 2;
  const C = 2 * Math.PI * r;
  const arcLogin = C * (300 / 360);
  const arcSignup = C * (40 / 360);

  const [hLogin, setHLogin] = useState(430);
  const [hSignup, setHSignup] = useState(500);
  const [hFooter, setHFooter] = useState(0);

  const p = useSharedValue(signUp ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(signUp ? 1 : 0, { duration: DURATION, easing: EASE });
  }, [signUp]);

  const dark = c.backgroundPrimary === INK;
  const sheetBg = dark ? '#141414' : c.backgroundPrimary;

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [INK, ACCENT]),
  }));
  const trackProps = useAnimatedProps(() => ({
    stroke: interpolateColor(p.value, [0, 1], ['#262626', 'rgba(10,10,10,0.14)']),
  }));
  const arcProps = useAnimatedProps(() => ({
    stroke: interpolateColor(p.value, [0, 1], [ACCENT, INK]),
    strokeDashoffset: C - interpolate(p.value, [0, 1], [arcLogin, arcSignup]),
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(p.value, [0, 1], [1, 0.55]) }],
  }));
  const brandStyle = useAnimatedStyle(() => ({
    color: interpolateColor(p.value, [0, 1], [PAPER, INK]),
  }));
  const captionWrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(p.value, [0, 1], [0, -ring * 0.22]) }],
  }));
  const capLoginStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.5], [1, 0], Extrapolation.CLAMP),
  }));
  const capSignupStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0.5, 1], [0, 1], Extrapolation.CLAMP),
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    height: interpolate(p.value, [0, 1], [hLogin, hSignup]) + HANDLE_SPACE + hFooter + insets.bottom + 16,
  }));
  const loginStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.45], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(p.value, [0, 1], [0, 72]) }],
  }));
  const signupStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0.35, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(p.value, [0, 1], [72, 0]) }],
  }));

  const mono = { fontFamily: 'GeistMono-Regular', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' as const };

  return (
    <Animated.View style={[{ flex: 1 }, bgStyle]}>
      <StatusBar style={signUp ? 'dark' : 'light'} animated />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Hero: ring + caption, centred in whatever space the sheet leaves */}
        <View style={{ flex: 1, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <Animated.View style={[{ width: ring, height: ring }, ringStyle]}>
            <Svg width={ring} height={ring} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <AnimatedCircle cx={ring / 2} cy={ring / 2} r={r} fill="none" strokeWidth={stroke} animatedProps={trackProps} />
              <AnimatedCircle
                cx={ring / 2} cy={ring / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={`${C} ${C}`} rotation={-60} origin={`${ring / 2}, ${ring / 2}`}
                animatedProps={arcProps}
              />
            </Svg>
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
              <Animated.Text
                accessibilityRole="header"
                style={[{ fontFamily: 'BricolageGrotesque-ExtraBold', fontSize: Math.round(ring * 0.18), letterSpacing: -ring * 0.008 }, brandStyle]}
              >
                Lock in.
              </Animated.Text>
            </View>
          </Animated.View>
          <Animated.View style={[{ width: 320, height: 18, marginTop: 14 }, captionWrapStyle]}>
            <Animated.Text style={[mono, { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: '#A8A79F' }, capLoginStyle]}>
              {captionLogin}
            </Animated.Text>
            <Animated.Text style={[mono, { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: INK }, capSignupStyle]}>
              {captionSignup}
            </Animated.Text>
          </Animated.View>
        </View>

        {/* Sheet: both forms stacked; the active one rises in, the other sinks away */}
        <Animated.View
          style={[{
            backgroundColor: sheetBg, borderTopLeftRadius: 32, borderTopRightRadius: 32,
            borderWidth: 2, borderBottomWidth: 0, borderColor: INK, overflow: 'hidden',
          }, sheetStyle]}
        >
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: dark ? '#3A3A3A' : '#C9C8C0' }} />
          </View>
          <Animated.View
            onLayout={(e) => setHLogin(e.nativeEvent.layout.height)}
            pointerEvents={signUp ? 'none' : 'auto'}
            accessibilityElementsHidden={signUp}
            importantForAccessibility={signUp ? 'no-hide-descendants' : 'auto'}
            style={[{ position: 'absolute', left: 0, right: 0, top: HANDLE_SPACE, paddingHorizontal: 22 }, loginStyle]}
          >
            {login}
          </Animated.View>
          <Animated.View
            onLayout={(e) => setHSignup(e.nativeEvent.layout.height)}
            pointerEvents={signUp ? 'auto' : 'none'}
            accessibilityElementsHidden={!signUp}
            importantForAccessibility={signUp ? 'auto' : 'no-hide-descendants'}
            style={[{ position: 'absolute', left: 0, right: 0, top: HANDLE_SPACE, paddingHorizontal: 22 }, signupStyle]}
          >
            {signup}
          </Animated.View>
          {footer ? (
            <View
              onLayout={(e) => setHFooter(e.nativeEvent.layout.height)}
              style={{ position: 'absolute', left: 22, right: 22, bottom: insets.bottom + 8 }}
            >
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}
