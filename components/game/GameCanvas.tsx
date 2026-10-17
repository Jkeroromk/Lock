import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, InteractionManager, Pressable, View } from 'react-native';
import { Canvas, Picture, Skia, type SkPicture } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { createEngine, W, H, type Engine, type EngineCmd } from '@/lib/game/engine/core';
import { makeSkiaGfx } from '@/lib/game/engine/gfxSkia';

export type GameCmd = EngineCmd;
export type GameViewHandle = { send: (cmd: GameCmd) => void };
export const GAME_ASPECT = H / W;

const emptyPicture = (): SkPicture => { const r = Skia.PictureRecorder(); r.beginRecording(Skia.XYWHRect(0, 0, 1, 1)); return r.finishRecordingAsPicture(); };

/**
 * The Lockling game drawn with React Native Skia. The engine
 * (lib/game/engine/core.js) records one picture per frame (~30 fps) while the
 * screen is focused; tapping advances its dialogue.
 */
const GameCanvas = forwardRef<GameViewHandle, {
  width: number;
  onReady?: () => void;
  onBusy?: (busy: boolean) => void;
  onDone?: (kind: string) => void;
}>(function GameCanvas({ width, onReady, onBusy, onDone }, ref) {
  const height = Math.round(width * GAME_ASPECT);
  const scale = width / W;
  const picture = useSharedValue<SkPicture>(emptyPicture());
  const engine = useRef<Engine | null>(null);
  const gfx = useRef<ReturnType<typeof makeSkiaGfx> | null>(null);
  const queue = useRef<GameCmd[]>([]);
  const hooks = useRef({ onReady, onBusy, onDone });
  hooks.current = { onReady, onBusy, onDone };
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
      });
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
    <Pressable onPress={() => engine.current?.tap()} accessibilityRole="button" accessibilityLabel="Lockling" style={{ width, height, borderRadius: 22, overflow: 'hidden', backgroundColor: '#151729' }}>
      <Canvas style={{ width, height }}>
        <Picture picture={picture} />
      </Canvas>
      {!ready ? (
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#ffd43b" />
        </View>
      ) : null}
    </Pressable>
  );
});

export default GameCanvas;
