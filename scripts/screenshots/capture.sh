#!/usr/bin/env bash
# Captures App Store screenshots of a screenshot-mode build (EXPO_PUBLIC_SCREENSHOT_MODE=1)
# on iOS simulators. Used by .github/workflows/screenshots.yml.
#
#   scripts/screenshots/capture.sh <Lock.app> <out dir>
#
# Writes <out>/<device>/<lang>/<shot>.png, device = iphone69 | duo.
set -euo pipefail

APP="$1"
OUT="$2"
BUNDLE=com.jkeroro.lockin
SHOTS=(${SHOTS:-photo today train buddy couple friends log})
LANGS=(${LANGS:-zh-CN en-US})
mkdir -p "$OUT"

# Every available iOS runtime, newest first. Some devices (iPhone Duo) only
# run on their own device-specific runtime, so creation tries each in turn.
runtimes=$(xcrun simctl list runtimes -j | python3 -c '
import json,sys
rs=[r for r in json.load(sys.stdin)["runtimes"] if r.get("platform")=="iOS" and r.get("isAvailable")]
rs.sort(key=lambda r: [int(x) for x in r["version"].split(".")], reverse=True)
print("\n".join(r["identifier"] for r in rs))')
[ -n "$runtimes" ] || { echo "::error::No iOS simulator runtime"; exit 1; }
echo "Runtimes:"; echo "$runtimes"

devtype() { # $1 = exact device type name
  xcrun simctl list devicetypes -j | python3 -c '
import json,sys
want=sys.argv[1]
for d in json.load(sys.stdin)["devicetypes"]:
    if d["name"]==want: print(d["identifier"]); break' "$1"
}

wait_for() { # $1 = shot
  case "$1" in
    buddy|couple) sleep 30 ;;
    photo) sleep 22 ;;
    *) sleep 16 ;;
  esac
}

shoot() { # $1 = udid, $2 = out .png. Multi-display devices (iPhone Duo):
  # the primary display goes to $2, every other display to $2 minus .png + -<name>.png
  local err
  if err=$(xcrun simctl io "$1" screenshot "$2" 2>&1 >/dev/null); then return 0; fi
  if ! grep -q 'Cannot choose between' <<<"$err"; then echo "$err" >&2; return 1; fi
  grep -oE -- '--display=[0-9]+ +[^ ]+ \([^)]*\)' <<<"$err" | while read -r opt dname kind; do
    if [[ "$kind" == "(primary)" ]]; then f="$2"; else f="${2%.png}-${dname,,}.png"; fi
    xcrun simctl io "$1" screenshot "$opt" "$f" >/dev/null 2>&1 || echo "::warning::$dname screenshot failed"
  done
}

capture_device() { # $1 = folder name, $2 = simulator device type name
  local name="$1" type_name="$2" type udid
  type=$(devtype "$type_name")
  if [ -z "$type" ]; then
    echo "::warning::No '$type_name' simulator on this runner; skipping $name"
    return 0
  fi
  udid=""
  for rt in $runtimes; do
    udid=$(xcrun simctl create "shots-$name" "$type" "$rt" 2>/dev/null) && break
    udid=""
  done
  if [ -z "$udid" ]; then
    echo "::warning::No runtime can run '$type_name'; skipping $name"
    return 0
  fi
  echo "== $name ($type_name) $udid on $rt"
  xcrun simctl boot "$udid" || true
  xcrun simctl bootstatus "$udid" -b
  xcrun simctl ui "$udid" appearance light || true
  xcrun simctl status_bar "$udid" override --time "9:41" --dataNetwork wifi --wifiMode active --wifiBars 3 \
    --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100 || true
  xcrun simctl install "$udid" "$APP"
  xcrun simctl privacy "$udid" grant photos "$BUNDLE" || true
  xcrun simctl privacy "$udid" grant camera "$BUNDLE" || true

  # First launch warms up (fonts, 3D, caches) and is not kept.
  xcrun simctl launch "$udid" "$BUNDLE" -kshot today -klang en-US >/dev/null
  sleep 40

  for lang in "${LANGS[@]}"; do
    local applang; applang=$([ "$lang" = zh-CN ] && echo zh-Hans || echo en)
    mkdir -p "$OUT/$name/$lang"
    for shot in "${SHOTS[@]}"; do
      xcrun simctl terminate "$udid" "$BUNDLE" >/dev/null 2>&1 || true
      sleep 1
      xcrun simctl launch "$udid" "$BUNDLE" -kshot "$shot" -klang "$lang" -AppleLanguages "($applang)" >/dev/null
      wait_for "$shot"
      shoot "$udid" "$OUT/$name/$lang/$shot.png"
      echo "  $lang/$shot ✓"
    done
  done
  xcrun simctl terminate "$udid" "$BUNDLE" >/dev/null 2>&1 || true
  xcrun simctl shutdown "$udid" || true
}

# One device failing must not cost the other's shots.
capture_device iphone69 "iPhone 17 Pro Max" || echo "::error::iphone69 capture failed"
capture_device duo "iPhone Duo" || echo "::error::duo capture failed"
ls -R "$OUT"
[ -n "$(find "$OUT" -name '*.png' -print -quit)" ] || { echo "::error::No screenshots"; exit 1; }
