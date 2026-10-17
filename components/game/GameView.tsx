import { forwardRef, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { ENGINE_HTML } from '@/lib/game/engineHtml';

export type GameCmd = { type: 'strings' | 'state' | 'look' | 'play'; [key: string]: unknown };
export type GameViewHandle = { send: (cmd: GameCmd) => void };

export const GAME_ASPECT = 320 / 288;

/**
 * The Lockling pixel game (game/engine.html) in a WebView. Commands sent before
 * the engine is ready are queued. Tapping the game advances its dialogue.
 */
const GameView = forwardRef<GameViewHandle, {
  width: number;
  onReady?: () => void;
  onBusy?: (busy: boolean) => void;
  onDone?: (kind: string) => void;
}>(function GameView({ width, onReady, onBusy, onDone }, ref) {
  const web = useRef<WebView>(null);
  const ready = useRef(false);
  const queue = useRef<GameCmd[]>([]);

  const send = (cmd: GameCmd) => {
    if (!ready.current) { queue.current.push(cmd); return; }
    web.current?.injectJavaScript(`window.LOCK && window.LOCK.cmd(${JSON.stringify(cmd)}); true;`);
  };
  useImperativeHandle(ref, () => ({ send }), []);

  const onMessage = (e: WebViewMessageEvent) => {
    let msg: { type?: string; busy?: boolean; kind?: string };
    try { msg = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (msg.type === 'ready') {
      ready.current = true;
      const pending = queue.current; queue.current = [];
      pending.forEach(send);
      onReady?.();
    } else if (msg.type === 'busy') onBusy?.(!!msg.busy);
    else if (msg.type === 'done') onDone?.(msg.kind ?? '');
  };

  return (
    <View style={{ width, height: Math.round(width * GAME_ASPECT), backgroundColor: '#151729', borderRadius: 22, overflow: 'hidden' }}>
      <WebView
        ref={web}
        source={{ html: ENGINE_HTML }}
        originWhitelist={['*']}
        onMessage={onMessage}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        style={{ backgroundColor: '#151729' }}
        accessibilityLabel="Lockling"
      />
    </View>
  );
});

export default GameView;
