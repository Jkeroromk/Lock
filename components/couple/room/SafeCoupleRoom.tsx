import React, { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { InteractionManager, StyleSheet, Text, View } from 'react-native';
import type { CoupleRoomProps } from './CoupleRoom';

/**
 * Guarded entry to the 3D couple room. Nothing from three / react-three-fiber
 * / expo-gl is imported here: CoupleRoom is required at runtime after the
 * screen's first paint, inside try/catch, and rendered under an error
 * boundary. If loading or rendering the 3D room throws, a flat stand-in stays
 * on screen (the header, day cards and nudges still work) instead of the
 * whole app going down.
 */

type Room = ComponentType<CoupleRoomProps>;

let roomModule: Room | null = null;
/** Once the 3D room has failed in this session, don't try again until the next launch. */
let disabled = false;

function loadRoom(): Room {
  if (roomModule) return roomModule;
  // Static string so Metro bundles it; evaluated only when first called.
  roomModule = (require('./CoupleRoom') as { default: Room }).default;
  return roomModule;
}

class Guard extends React.Component<{ fallback: ReactNode; onError: (e: unknown) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { this.props.onError(error); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function Fallback({ style }: Pick<CoupleRoomProps, 'style'>) {
  return (
    <View style={[styles.fallback, style]}>
      <Text style={styles.heart}>❤</Text>
    </View>
  );
}

export default function SafeCoupleRoom(props: CoupleRoomProps) {
  const [Room, setRoom] = useState<Room | null>(() => (disabled ? null : roomModule));
  const [failed, setFailed] = useState(disabled);

  const fail = (where: string, e: unknown) => {
    disabled = true;
    console.warn(`[CoupleRoom] ${where}:`, e);
    setFailed(true);
  };

  useEffect(() => {
    if (Room || failed) return;
    let alive = true;
    // Let the screen paint first, then pull in three.js.
    const task = InteractionManager.runAfterInteractions(() => {
      if (!alive || disabled) return;
      try {
        const R = loadRoom();
        if (alive) setRoom(() => R);
      } catch (e) {
        if (alive) fail('import', e);
      }
    });
    return () => { alive = false; task.cancel(); };
  }, [Room, failed]);

  const fallback = <Fallback style={props.style} />;
  if (failed || !Room) return fallback;
  return (
    <Guard fallback={fallback} onError={(e) => fail('render', e)}>
      <Room {...props} />
    </Guard>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: '#F2F1EC', alignItems: 'center', justifyContent: 'center' },
  heart: { fontSize: 56, color: '#FF8FA3', opacity: 0.5 },
});
