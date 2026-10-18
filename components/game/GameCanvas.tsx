import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, InteractionManager, Pressable, View } from 'react-native';
import { Canvas, Picture, Skia, type SkPicture } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { createEngine, W, type Engine, type EngineCmd, type GameAction } from '@/lib/game/engine/core';
import { makeSkiaGfx } from '@/lib/game/engine/gfxSkia';

export type GameCmd = EngineCmd;
export type GameViewHandle = { send: (cmd: GameCmd) => void };

const emptyPicture = (): SkPicture => { const r = Skia.PictureRecorder(); r.beginRecording(Skia.XYWHRect(0, 0, 1, 1)); return r.finishRecordingAsPicture(); };

/**
 * The Lockling game drawn with React Native Skia, filling width × height. The
 * engine (lib/game/engine/core.js) records one picture per frame (~30 fps)
 * while the screen is focused. Taps go to the engine: they advance dialogue or
 * tap things in the yard (reported through onAction).
 */
const GameCanvas = forwardRef<GameViewHandle, {
  width: number;
  height: number;
  /** Space at the top to keep clear (status bar), in points. */
  insetTop?: number;
  /** Height of the tab bar floating over the bottom, in points. */
  insetBottom?: number;
  /** Home-indicator inset, in points. */
  safeBottom?: number;
  onReady?: () => void;
  onBusy?: (busy: boolean) => void;
  onDone?: (kind: string) => void;
  onAction?: (action: GameAction) => void;
}>(function GameCanvas({ width, height, insetTop = 0, insetBottom = 0, safeBottom = 0, onReady, onBusy, onDone, onAction }, ref) {
  const scale = width / W;
  const picture = useSharedValue<SkPicture>(emptyPicture());
  const engine = useRef<Engine | null>(null);
  const gfx = useRef<ReturnType<typeof makeSkiaGfx> | null>(null);
  const queue = useRef<GameCmd[]>([]);
  const hooks = useRef({ onReady, onBusy, onDone, onAction });
  hooks.current = { onReady, onBusy, onDone, onAction };
  const [ready, setReady] = useState(false);
  const focused = useIsFocused();

  useImperativeHandle(ref, () => ({
    send: (cmd) => { if (engine.current) engine.current.cmd(cmd); else queue.current.push(cmd); },
  }), []);

  // Building the room and sprites takes a moment; do it after the screen has painted.
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      gfx.current = makeSkiaGfx();
      engine.current = createEngine(gfx.current, {
        onBusy: (b) => hooks.current.onBusy?.(b),
        onDone: (k) => hooks.current.onDone?.(k),
        onAction: (a) => hooks.current.onAction?.(a),
      }, { height: height / scale, top: insetTop / scale, bottom: insetBottom / scale, safeBottom: safeBottom / scale });
      const pending = queue.current; queue.current = [];
      pending.forEach((c) => engine.current!.cmd(c));
      setReady(true);
      hooks.current.onReady?.();
    });
    return () => task.cancel();
  }, []);

  useEffect(() => {
    if (!ready || !focused) return;
    let raf = 0, last = 0, alive = true;
    const frame = (t: number) => {
      if (!alive) return;
      if (t - last >= 32 && engine.current && gfx.current) {
        last = t;
        const rec = Skia.PictureRecorder();
        const c = rec.beginRecording(Skia.XYWHRect(0, 0, width, height));
        c.scale(scale, scale);
        gfx.current.setCanvas(c);
        engine.current.render(t);
        picture.value = rec.finishRecordingAsPicture();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [ready, focused, width, height, scale]);

  return (
    <View style={{ width, height, backgroundColor: '#0d0f1c' }}>
      <Canvas style={{ width, height }} pointerEvents="none">
        <Picture picture={picture} />
      </Canvas>
      {/* A plain view on top takes every tap, so the canvas never swallows them. */}
      <Pressable
        onPress={(e) => engine.current?.tap(e.nativeEvent.locationX / scale, e.nativeEvent.locationY / scale)}
        accessibilityRole="button"
        accessibilityLabel="Lockling"
        style={{ position: 'absolute', left: 0, top: 0, width, height }}
      />
      {!ready ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#ffd43b" />
        </View>
      ) : null}
    </View>
  );
});

export default GameCanvas;
