import { useEffect, useRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';

/**
 * Small confirmation pill above the tab bar — replaces "Success / OK" alerts
 * for things that just worked. Optional action (e.g. Undo). Call from anywhere:
 *
 *   showToast({ message: 'Saved', action: { label: 'Undo', onPress } })
 */
export interface ToastOptions {
  message: string;
  /** Second line, smaller. */
  detail?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: { label: string; onPress: () => void };
  /** ms; default 4000 (6000 with an action, so there's time to tap it). */
  duration?: number;
}

type Listener = (t: (ToastOptions & { id: number }) | null) => void;
const listeners = new Set<Listener>();
let nextId = 1;

export function showToast(options: ToastOptions) {
  const toast = { ...options, id: nextId++ };
  listeners.forEach((l) => l(toast));
}

/** Mount once near the root. */
export function ToastHost() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const listener: Listener = (next) => {
      if (timer.current) clearTimeout(timer.current);
      setToast(next);
      if (next) {
        const ms = next.duration ?? (next.action ? 6000 : 4000);
        timer.current = setTimeout(() => setToast(null), ms);
      }
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!toast) return null;

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 96, alignItems: 'center', paddingHorizontal: 16 }}>
      <Animated.View
        key={toast.id}
        entering={FadeInDown.duration(260)}
        exiting={FadeOutDown.duration(200)}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={{
          width: '100%', maxWidth: 480, flexDirection: 'row', alignItems: 'center', gap: 12,
          backgroundColor: c.ink, borderRadius: 18, borderWidth: 2, borderColor: c.ink,
          paddingLeft: 16, paddingRight: toast.action ? 6 : 16, paddingVertical: 10, minHeight: 56,
          shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
        }}
      >
        <Ionicons name={toast.icon ?? 'checkmark-circle'} size={22} color={c.accent} />
        <Pressable style={{ flex: 1 }} onPress={() => setToast(null)} accessibilityRole="button" accessibilityLabel={toast.message}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: c.paper }} numberOfLines={1}>{toast.message}</Text>
          {toast.detail ? (
            <Text style={{ fontSize: 13, color: c.paper, opacity: 0.7, marginTop: 1 }} numberOfLines={1}>{toast.detail}</Text>
          ) : null}
        </Pressable>
        {toast.action ? (
          <Pressable
            onPress={() => { toast.action!.onPress(); setToast(null); }}
            accessibilityRole="button"
            style={({ pressed }) => ({
              minHeight: 44, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center',
              backgroundColor: c.accent, opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: c.onAccent }}>{toast.action.label}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}
