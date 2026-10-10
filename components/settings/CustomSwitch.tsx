import { TouchableOpacity, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { useTheme } from '@/hooks/useTheme';

interface CustomSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel?: string;
}

const W = 54;
const H = 32;
const THUMB = 22;
const PAD = 3;

/** B×C toggle: yellow track with ink stroke when on, outlined when off. */
export default function CustomSwitch({ value, onValueChange, accessibilityLabel }: CustomSwitchProps) {
  const c = useTheme();
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(x, { toValue: value ? 1 : 0, useNativeDriver: true, tension: 140, friction: 9 }).start();
  }, [value, x]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={{
        width: W, height: H, borderRadius: H / 2, padding: PAD, justifyContent: 'center',
        backgroundColor: value ? c.accent : 'transparent',
        borderWidth: 2, borderColor: value ? c.ink : c.borderPrimary,
      }}
    >
      <Animated.View
        style={{
          width: THUMB, height: THUMB, borderRadius: THUMB / 2,
          backgroundColor: value ? c.ink : c.textSecondary,
          transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, W - THUMB - PAD * 2 - 4] }) }],
        }}
      />
    </TouchableOpacity>
  );
}
