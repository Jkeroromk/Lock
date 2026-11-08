import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useSheetSides } from '@/hooks/useSheetSides';

/**
 * A bottom sheet in a Modal: the dim backdrop fades in place while only the
 * sheet slides up. (Modal's own animationType="slide" slides the backdrop too,
 * so a big dark band rides up with the sheet.)
 */
export default function SheetModal({ visible, onClose, children, style, closeLabel, keyboard = false, dim = 0.5 }: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** The sheet's own style (background, radius, padding…). */
  style?: StyleProp<ViewStyle>;
  closeLabel?: string;
  /** Lift the sheet above the keyboard (forms). */
  keyboard?: boolean;
  /**
   * Backdrop darkness (0–1). Dark enough by default that the page behind
   * recedes and the sheet holds the focus; lighter only where the page
   * behind is part of the task (e.g. placing furniture in the room).
   */
  dim?: number;
}) {
  const { height } = useWindowDimensions();
  const sides = useSheetSides();
  const [mounted, setMounted] = useState(visible);
  const k = useRef(new Animated.Value(0)).current; // 0 hidden … 1 shown

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(k, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(k, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true })
        .start(({ finished }) => { if (finished) setMounted(false); });
    }
  }, [visible]);

  if (!mounted) return null;
  const sheet = (
    <Animated.View style={[{ marginTop: 'auto', transform: [{ translateY: k.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${dim})`, opacity: k }]}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={closeLabel} />
      </Animated.View>
      <KeyboardAvoidingView enabled={keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[{ flex: 1 }, sides]} pointerEvents="box-none">
        {sheet}
      </KeyboardAvoidingView>
    </Modal>
  );
}
