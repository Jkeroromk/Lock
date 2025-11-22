import { TouchableOpacity, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

interface CustomSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export default function CustomSwitch({ value, onValueChange }: CustomSwitchProps) {
  const translateX = useRef(new Animated.Value(value ? 1 : 0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: value ? 1 : 0,
        useNativeDriver: true,
        tension: 120,
        friction: 7,
      }),
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 0.95,
          useNativeDriver: true,
          tension: 300,
          friction: 10,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 300,
          friction: 10,
        }),
      ]),
    ]).start();
  }, [value, translateX, scale]);

  const switchWidth = 56;
  const switchHeight = 34;
  const thumbSize = 26;
  const padding = 4;
  const translateDistance = switchWidth - thumbSize - padding * 2;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => onValueChange(!value)}
      style={{
        width: switchWidth,
        height: switchHeight,
        borderRadius: switchHeight / 2,
        backgroundColor: value ? '#FFFFFF' : '#000000',
        borderWidth: 2.5,
        borderColor: value ? '#D1D1D1' : '#000000',
        justifyContent: 'center',
        padding: padding,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: value ? 0.15 : 0.3,
        shadowRadius: 4,
        elevation: 4,
      }}
    >
      <Animated.View
        style={{
          width: thumbSize,
          height: thumbSize,
          borderRadius: thumbSize / 2,
          backgroundColor: value ? '#000000' : '#FFFFFF',
          transform: [
            {
              translateX: translateX.interpolate({
                inputRange: [0, 1],
                outputRange: [0, translateDistance],
              }),
            },
            {
              scale: scale,
            },
          ],
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
        }}
      />
    </TouchableOpacity>
  );
}

