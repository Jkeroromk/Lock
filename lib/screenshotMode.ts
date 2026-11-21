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

/**
 * Lets a screen hand one of its own actions (e.g. the log screen's "save meal")
 * to the screenshot/video director. No-op outside screenshot builds.
 */
export function registerShotAction(_name: string, _fn: () => unknown): void {}
