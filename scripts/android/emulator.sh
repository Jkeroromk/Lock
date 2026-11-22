#!/usr/bin/env bash
# Runs a Lock APK on the booted Android emulator and saves what it shows.
#
#   scripts/android/emulator.sh smoke <apk> <outdir>
#       Real app: launch, wait, screenshot, and keep logcat. Writes crash.txt
#       (and exits 1) when the app hit a fatal exception.
#   scripts/android/emulator.sh shots <apk> <outdir> [langs] [shots]
#       Screenshot build (eas profile android-screenshots, demo account):
#       opens each screen via lock:///?kshot=…&klang=… and waits for the app's
#       "LOCK_SHOT_READY <shot>" log line before taking the screenshot.
set -u
MODE=$1; APK=$2; OUT=$3
LANGS=${4:-"en-US zh-CN"}
SHOTS=${5:-"today photo log train buddy couple friends calendar"}
PKG=com.jkeroro.lockin
mkdir -p "$OUT"

adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 2; done
sleep 20  # let the launcher settle; a slow CI emulator otherwise shows "isn't responding" dialogs
for k in window_animation_scale transition_animation_scale animator_duration_scale; do
  adb shell settings put global "$k" 0 || true
done
# -g: grant runtime permissions (camera, notifications) so no system dialog covers the app.
adb install -r -g "$APK" || { echo "::error::adb install failed"; exit 1; }

# System "X isn't responding" dialogs come from the slow emulator, not Lock.
dismiss() { adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null 2>&1 || true; }
shot() { dismiss; sleep 1; adb exec-out screencap -p > "$1"; }
crashes() { adb logcat -d -b crash > "$OUT/crash-$1.txt" 2>/dev/null; [ -s "$OUT/crash-$1.txt" ] || rm -f "$OUT/crash-$1.txt"; }

if [ "$MODE" = smoke ]; then
  adb logcat -c; adb logcat -b crash -c 2>/dev/null || true
  adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null
  sleep 10; shot "$OUT/smoke-10s.png"
  sleep 15; shot "$OUT/smoke-25s.png"
  sleep 20; shot "$OUT/smoke-45s.png"
  adb logcat -d > "$OUT/logcat.txt"
  grep -E "ReactNativeJS|AndroidRuntime" "$OUT/logcat.txt" | tail -200 > "$OUT/js-log.txt" || true
  crashes smoke
  if [ -f "$OUT/crash-smoke.txt" ] || ! adb shell pidof "$PKG" >/dev/null; then
    echo "::error title=Android smoke test::The app is not running after launch (see crash-smoke.txt / logcat.txt)."
    grep -m1 -A25 "FATAL EXCEPTION" "$OUT/logcat.txt" > "$OUT/crash.txt" || true
    exit 1
  fi
  exit 0
fi

failed=0
for lang in $LANGS; do
  for s in $SHOTS; do
    name="$lang-$s"
    ok=0
    for attempt in 1 2; do
      adb shell am force-stop "$PKG"
      adb logcat -c; adb logcat -b crash -c 2>/dev/null || true
      adb shell "am start -W -a android.intent.action.VIEW -d 'lock:///?kshot=$s&klang=$lang' $PKG" >/dev/null
      for _ in $(seq 1 40); do
        if adb logcat -d -s ReactNativeJS:V | grep -q "LOCK_SHOT_READY $s"; then ok=1; break; fi
        sleep 2
      done
      [ $ok = 1 ] && break
      echo "$name: not ready (attempt $attempt)"
      crashes "$name"
      [ -f "$OUT/logcat-first-failure.txt" ] || adb logcat -d > "$OUT/logcat-first-failure.txt"
    done
    shot "$OUT/$name.png"
    adb logcat -d -s ReactNativeJS:V > "$OUT/$name.log" 2>/dev/null || true
    if [ $ok = 1 ]; then echo "$name: ok"; else echo "::warning title=Android screenshot::$name never signalled ready"; failed=$((failed + 1)); fi
  done
done
echo "$failed screen(s) never signalled ready"
exit 0
