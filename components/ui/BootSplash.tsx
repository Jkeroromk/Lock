import { ReactNode } from 'react';
import { View, Image, useWindowDimensions } from 'react-native';

/** Must match app.json → splash (image, resizeMode "contain", backgroundColor). */
export const SPLASH_BACKGROUND = '#0A0A0A';
const SPLASH_IMAGE = require('@/assets/splash.png');

/**
 * A pixel-for-pixel copy of the native launch screen, drawn in JS. Rendering
 * this first means the hand-off from the native splash to the app has no
 * visible jump: same background, same mark, same position. Anything passed as
 * `children` is laid out below the mark (spinner, hint) without moving it.
 */
export default function BootSplash({ children }: { children?: ReactNode }) {
  const { width, height } = useWindowDimensions();
  // "contain" on a square image → the image spans the screen width, centered.
  const size = Math.min(width, height);
  return (
    <View style={{ flex: 1, backgroundColor: SPLASH_BACKGROUND }} accessibilityLabel="Lock" accessible>
      <Image
        source={SPLASH_IMAGE}
        style={{ position: 'absolute', width: size, height: size, left: (width - size) / 2, top: (height - size) / 2 }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      {children ? (
        <View style={{ position: 'absolute', left: 0, right: 0, top: height / 2 + size * 0.24, alignItems: 'center' }}>
          {children}
        </View>
      ) : null}
    </View>
  );
}
