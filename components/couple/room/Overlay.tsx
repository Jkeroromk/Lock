import { memo, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { FONTS } from '@/constants/fonts';
import { DESIGN_PPU, MAX_FRAMES, SLOT, STRIDE } from './world';

/**
 * Everything with words in the room — name tags, speech bubbles, the
 * anniversary board and the frame captions — is ordinary React Native text
 * laid over the 3D view (so it uses the app's fonts, any language, and never
 * rebuilds a texture). The 3D loop projects each anchor to the screen and
 * writes the results into one shared value; each overlay reads its slot in a
 * UI-thread style, so moving them never re-renders React.
 */

const INK = '#0A0A0A';
const PAPER = '#F2F1EC';
const SUB = '#55544F';

// Fixed boxes so nothing needs measuring: content is pinned to the box's
// bottom-centre (tags, bubbles) or centre (wall items) and the box is moved.
const TAG_W = 200, TAG_H = 40;
const BUBBLE_W = 220, BUBBLE_H = 160;
const BOARD_W = 1.5 * DESIGN_PPU, BOARD_H = 1.9 * DESIGN_PPU;
const FRAME = 0.9 * DESIGN_PPU;

export interface OverlayFrame { id: string; title: string; sub: string; emoji: string }

export interface OverlayProps {
  pos: SharedValue<number[]>;
  meName: string;
  partnerName: string;
  bubbles: { me?: string | null; partner?: string | null; pet?: string | null; object?: string | null };
  boardTitle: string;
  boardDays: string;
  nextLabel: string;
  frames: OverlayFrame[];
}

function Overlay({ pos, meName, partnerName, bubbles, boardTitle, boardDays, nextLabel, frames }: OverlayProps) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* wall content first, so people's tags and bubbles sit above it */}
      <WallItem pos={pos} slot={SLOT.board} w={BOARD_W} h={BOARD_H}>
        <View style={{ height: BOARD_H * (30 / 160), alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 }}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 17, fontWeight: '800', color: INK }}>{boardTitle}</Text>
        </View>
        <View style={{ height: BOARD_H * (70 / 160), alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }}>
          <Text numberOfLines={2} adjustsFontSizeToFit style={{ fontSize: 30, lineHeight: 36, fontWeight: '800', color: INK, textAlign: 'center' }}>{boardDays}</Text>
        </View>
        <View style={{ position: 'absolute', left: BOARD_W * (12 / 128), right: BOARD_W * (12 / 128), top: BOARD_H * (102 / 160), height: BOARD_H * (44 / 160), alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
          <Text numberOfLines={2} adjustsFontSizeToFit style={{ fontSize: 15, lineHeight: 19, fontWeight: '800', color: INK, textAlign: 'center' }}>{nextLabel}</Text>
        </View>
      </WallItem>
      {Array.from({ length: MAX_FRAMES }, (_, i) => {
        const f = frames[i];
        return (
          <WallItem key={i} pos={pos} slot={SLOT.frame0 + i} w={FRAME} h={FRAME}>
            {f ? (
              <>
                <View style={{ height: FRAME * (0.62 / 0.9), alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 44, lineHeight: 52 }}>{f.emoji}</Text>
                </View>
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: FRAME * (0.26 / 0.9), alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                  <Text numberOfLines={1} style={{ fontSize: 13, lineHeight: 15, fontWeight: '800', color: INK }}>{f.title}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: FONTS.mono, fontSize: 9, lineHeight: 11, color: SUB }}>{f.sub}</Text>
                </View>
              </>
            ) : null}
          </WallItem>
        );
      })}

      <Tag pos={pos} slot={SLOT.tagMe} name={meName} />
      <Tag pos={pos} slot={SLOT.tagPartner} name={partnerName} />
      <Bubble pos={pos} slot={SLOT.bubbleObject} text={bubbles.object} />
      <Bubble pos={pos} slot={SLOT.bubblePet} text={bubbles.pet} />
      <Bubble pos={pos} slot={SLOT.bubbleMe} text={bubbles.me} />
      <Bubble pos={pos} slot={SLOT.bubblePartner} text={bubbles.partner} />
    </View>
  );
}

export default memo(Overlay);

/** A box whose bottom-centre follows the slot's point (fixed pixel size). */
function useAnchored(pos: SharedValue<number[]>, slot: number, w: number, h: number, lift: number, fade?: SharedValue<number>) {
  return useAnimatedStyle(() => {
    const v = pos.value;
    const i = slot * STRIDE;
    return {
      opacity: (v[i + 2] ?? 0) * (fade ? fade.value : 1),
      transform: [{ translateX: (v[i] ?? -999) - w / 2 }, { translateY: (v[i + 1] ?? -999) - h - lift }],
    };
  });
}

function Tag({ pos, slot, name }: { pos: SharedValue<number[]>; slot: number; name: string }) {
  const st = useAnchored(pos, slot, TAG_W, TAG_H, 0);
  return (
    <Animated.View style={[styles.box, { width: TAG_W, height: TAG_H }, st]}>
      <View style={{ backgroundColor: INK, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, maxWidth: TAG_W }}>
        <Text numberOfLines={1} style={{ color: PAPER, fontSize: 12, fontWeight: '800' }}>{name}</Text>
      </View>
    </Animated.View>
  );
}

/** A speech bubble: fades in when it gets text, fades out (keeping the last words) when cleared. */
function Bubble({ pos, slot, text }: { pos: SharedValue<number[]>; slot: number; text?: string | null }) {
  const [shown, setShown] = useState(text ?? '');
  const fade = useSharedValue(text ? 1 : 0);
  useEffect(() => {
    if (text) { setShown(text); fade.value = withTiming(1, { duration: 250 }); }
    else fade.value = withTiming(0, { duration: 250 });
  }, [text]);
  const st = useAnchored(pos, slot, BUBBLE_W, BUBBLE_H, 10, fade);
  if (!shown) return null;
  return (
    <Animated.View style={[styles.box, { width: BUBBLE_W, height: BUBBLE_H }, st]}>
      <View style={styles.bubble}>
        <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: '800', color: INK }}>{shown}</Text>
      </View>
    </Animated.View>
  );
}

/** Content pinned to the anniversary wall: centred on the slot, scaled with distance, squashed as the wall turns. */
function WallItem({ pos, slot, w, h, children }: { pos: SharedValue<number[]>; slot: number; w: number; h: number; children: ReactNode }) {
  const st = useAnimatedStyle(() => {
    const v = pos.value;
    const i = slot * STRIDE;
    const s = v[i + 3] ?? 1;
    return {
      opacity: v[i + 2] ?? 0,
      transform: [
        { translateX: (v[i] ?? -999) - w / 2 },
        { translateY: (v[i + 1] ?? -999) - h / 2 },
        { scaleX: s * (v[i + 4] ?? 1) },
        { scaleY: s },
      ],
    };
  });
  return <Animated.View style={[styles.wall, { width: w, height: h }, st]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  box: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'flex-end' },
  wall: { position: 'absolute', left: 0, top: 0, overflow: 'hidden' },
  bubble: {
    maxWidth: 200, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: INK, borderRadius: 14,
    paddingHorizontal: 11, paddingVertical: 7,
    shadowColor: INK, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 3, height: 3 }, elevation: 0,
  },
});
