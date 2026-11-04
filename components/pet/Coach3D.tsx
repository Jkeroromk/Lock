import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { AppState, InteractionManager, type StyleProp, type ViewStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import type { CoachPose } from '@/constants/pets';
import type { PetSpriteHandle } from './PetSprite';
import { recordJsError } from '@/lib/crashlog';

/**
 * Guarded entry to the 3D coach. Nothing from three / react-three-fiber /
 * expo-gl is imported here: the scene module (Coach3DScene) is required at
 * runtime after the tab has mounted, inside try/catch, and rendered under an
 * error boundary. If loading the module, loading the model, or rendering the
 * canvas throws, the 2D sprite (`fallback`) stays on screen and the error is
 * recorded (Settings → About) instead of taking the app down.
 *
 * Native crashes (inside expo-gl / the GPU driver) can't be caught, so there
 * is also a tripwire: a flag is set while the 3D view is mounted and cleared
 * when it unmounts or the app goes to the background. If the flag is still
 * there on the next launch, the app died with 3D on screen, and 3D stays off
 * for this build/update (it's retried after the next OTA or build).
 */

interface Props {
  pose: CoachPose;
  size: number;
  fallback: ReactNode;
  fallbackRef?: { current: PetSpriteHandle | null };
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

type SceneProps = Props & { onCrash?: (where: string, e: unknown) => void };
type SceneComponent = React.ForwardRefExoticComponent<SceneProps & React.RefAttributes<PetSpriteHandle>>;

const ARMED_KEY = 'lock.coach3d.armed';
const DISABLED_KEY = 'lock.coach3d.disabledFor';
const BUILD = Updates.updateId || 'embedded';

/** Once the 3D path has failed in this session, don't try again until the next launch. */
let disabled = false;
let checked: Promise<void> | null = null;
let sceneModule: SceneComponent | null = null;
let mounted = 0;

/** Startup check (once): did the app die last time while 3D was showing? Is 3D switched off for this build? */
function checkTripwire(): Promise<void> {
  if (checked) return checked;
  checked = (async () => {
    try {
      const [armed, disabledFor] = await Promise.all([AsyncStorage.getItem(ARMED_KEY), AsyncStorage.getItem(DISABLED_KEY)]);
      if (armed) {
        await AsyncStorage.setItem(DISABLED_KEY, armed);
        await AsyncStorage.removeItem(ARMED_KEY);
        recordJsError('coach3d:tripwire', new Error(`app died while the 3D coach was on screen (update ${armed}); 3D off for that update`));
        if (armed === BUILD) disabled = true;
      } else if (disabledFor === BUILD) {
        disabled = true;
      }
    } catch {}
  })();
  return checked;
}

function arm() {
  mounted++;
  if (mounted === 1) AsyncStorage.setItem(ARMED_KEY, BUILD).catch(() => {});
}
function disarm() {
  mounted = Math.max(0, mounted - 1);
  if (mounted === 0) AsyncStorage.removeItem(ARMED_KEY).catch(() => {});
}
// Leaving the app normally (home, app switcher, force quit from there) is not a crash.
AppState.addEventListener('change', (s) => {
  if (s === 'background') AsyncStorage.removeItem(ARMED_KEY).catch(() => {});
  else if (s === 'active' && mounted > 0) AsyncStorage.setItem(ARMED_KEY, BUILD).catch(() => {});
});

function loadSceneModule(): SceneComponent {
  if (sceneModule) return sceneModule;
  // Static string so Metro bundles it; evaluated only when first called.
  const mod = require('./Coach3DScene') as { Coach3DScene: SceneComponent };
  sceneModule = mod.Coach3DScene;
  return sceneModule;
}

class Guard extends React.Component<{ fallback: ReactNode; onError: (e: unknown) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { this.props.onError(error); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export const Coach3D = forwardRef<PetSpriteHandle, Props>(function Coach3D(props, ref) {
  const [Scene, setScene] = useState<SceneComponent | null>(() => (disabled ? null : sceneModule));
  const [failed, setFailed] = useState(disabled);
  const inner = useRef<PetSpriteHandle | null>(null);

  const fail = (where: string, e: unknown) => {
    disabled = true;
    recordJsError(where, e);
    if (__DEV__) console.warn(`[Coach3D] ${where}:`, e);
    setFailed(true);
  };

  useEffect(() => {
    if (Scene || failed) return;
    let alive = true;
    // Let the tab finish its first paint with the 2D sprite before pulling in three.js.
    const task = InteractionManager.runAfterInteractions(async () => {
      await checkTripwire();
      if (!alive) return;
      if (disabled) { setFailed(true); return; }
      try {
        const S = loadSceneModule();
        if (alive) setScene(() => S);
      } catch (e) {
        if (alive) fail('coach3d:import', e);
      }
    });
    return () => { alive = false; task.cancel(); };
  }, [Scene, failed]);

  const use3d = !!Scene && !failed;
  useEffect(() => {
    if (!use3d) return;
    arm();
    return disarm;
  }, [use3d]);

  useImperativeHandle(ref, () => ({
    hop: () => (use3d ? inner.current?.hop() : props.fallbackRef?.current?.hop()),
    hearts: (n?: number) => (use3d ? inner.current?.hearts(n) : props.fallbackRef?.current?.hearts(n)),
    grow: () => (use3d ? inner.current?.grow() : props.fallbackRef?.current?.grow()),
  }), [use3d, props.fallbackRef]);

  if (!use3d || !Scene) return <>{props.fallback}</>;
  return (
    <Guard fallback={props.fallback} onError={(e) => fail('coach3d:render', e)}>
      <Scene ref={inner} {...props} onCrash={fail} />
    </Guard>
  );
});
