/**
 * App Store screenshot mode hook.
 *
 * In every normal build this file is what gets bundled: it renders nothing.
 * Screenshot builds (EXPO_PUBLIC_SCREENSHOT_MODE=1, see metro.config.js and
 * .github/workflows/screenshots.yml) swap it for screenshot/index.tsx, which
 * signs into a demo account with made-up data and opens the screen to capture.
 */
export const SCREENSHOT_MODE = false;

export function ScreenshotDirector(): null {
  return null;
}
