#!/usr/bin/env bash
# Records the app screens for promo videos on an iPhone 17 Pro Max simulator.
# Used by .github/workflows/videos.yml after a screenshot-mode build
# (EXPO_PUBLIC_SCREENSHOT_MODE=1, demo account; see screenshot/index.tsx).
#
#   scripts/videos/record.sh <Lock.app> <spec.json> <out dir>
#
# For every video × language in the spec it writes
#   <out>/<id>-<lang>.mov            what the simulator showed
#   <out>/<id>-<lang>.timeline.json  scene start times (ms after "go")
#   <out>/<id>-<lang>.meta.json      {"goOffset": seconds from recording start to "go"}
set -euo pipefail

APP="$1"; SPEC="$2"; OUT="$3"
BUNDLE=com.jkeroro.lockin
mkdir -p "$OUT"

# "<id> <lang> <scene:ms,...>" per line
jobs=$(python3 - "$SPEC" <<'PY'
import json, sys
spec = json.load(open(sys.argv[1]))
for v in spec["videos"]:
    clip = ",".join(f'{s["scene"]}:{int(s.get("ms", 3000))}' for s in v["scenes"])
    for lang in v.get("langs", ["en", "zh"]):
        print(v["id"], lang, clip)
PY
)
[ -n "$jobs" ] || { echo "::error::No videos in $SPEC"; exit 1; }
echo "$jobs"

runtimes=$(xcrun simctl list runtimes -j | python3 -c '
import json,sys
rs=[r for r in json.load(sys.stdin)["runtimes"] if r.get("platform")=="iOS" and r.get("isAvailable")]
rs.sort(key=lambda r: [int(x) for x in r["version"].split(".")], reverse=True)
print("\n".join(r["identifier"] for r in rs))')
type=$(xcrun simctl list devicetypes -j | python3 -c '
import json,sys
for d in json.load(sys.stdin)["devicetypes"]:
    if d["name"]=="iPhone 17 Pro Max": print(d["identifier"]); break')
[ -n "$type" ] || { echo "::error::No iPhone 17 Pro Max simulator"; exit 1; }
udid=""
for rt in $runtimes; do udid=$(xcrun simctl create video-phone "$type" "$rt" 2>/dev/null) && break; udid=""; done
[ -n "$udid" ] || { echo "::error::Could not create the simulator"; exit 1; }

xcrun simctl boot "$udid" || true
xcrun simctl bootstatus "$udid" -b
xcrun simctl ui "$udid" appearance light || true
xcrun simctl status_bar "$udid" override --time "9:41" --dataNetwork wifi --wifiMode active --wifiBars 3 \
  --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100 || true
xcrun simctl install "$udid" "$APP"
xcrun simctl privacy "$udid" grant photos "$BUNDLE" || true
xcrun simctl privacy "$udid" grant camera "$BUNDLE" || true

# The app's data folder, looked up once per launch: simctl calls get slow while the
# simulator is busy recording, so polling must only touch the file system.
DOCS=""
docs() { echo "$(xcrun simctl get_app_container "$udid" "$BUNDLE" data 2>/dev/null)/Documents"; }
wait_file() { # $1 = name, $2 = seconds (wall clock)
  local until=$(( $(date +%s) + $2 ))
  while [ "$(date +%s)" -lt "$until" ]; do
    [ -d "$DOCS" ] || DOCS=$(docs)  # not created yet right after install
    [ -e "$DOCS/$1" ] && return 0
    sleep 0.5
  done
  return 1
}
now() { python3 -c 'import time; print(time.time())'; }

# Warm-up launch (fonts, 3D, caches), not recorded.
xcrun simctl launch "$udid" "$BUNDLE" -kshot buddy -klang en-US >/dev/null
DOCS=""; wait_file shot-ready 120 || echo "warm-up never signalled ready"

failed=0
while read -r id lang clip; do
  [ -n "$id" ] || continue
  applang=$([ "$lang" = zh ] && echo zh-Hans || echo en)
  klang=$([ "$lang" = zh ] && echo zh-CN || echo en-US)
  name="$id-$lang"
  # Total hold time + generous slack for loading and analysis.
  budget=$(python3 -c "print(int(sum(int(x.split(':')[1]) for x in '$clip'.split(','))/1000) + 300)")
  ok=0
  for try in 1 2; do
    xcrun simctl terminate "$udid" "$BUNDLE" >/dev/null 2>&1 || true
    sleep 1
    DOCS=$(docs)
    rm -f "$DOCS"/clip-* "$DOCS/shot-ready" 2>/dev/null || true
    xcrun simctl launch "$udid" "$BUNDLE" -kclip "$clip" -klang "$klang" -AppleLanguages "($applang)" >/dev/null
    if ! wait_file clip-armed 240; then echo "  $name never armed (try $try)"; continue; fi

    rm -f "$OUT/$name.mov"
    xcrun simctl io "$udid" recordVideo --codec=hevc --force "$OUT/$name.mov" > "$OUT/$name.rec.log" 2>&1 &
    rec=$!
    t_rec=$(now)
    # recordVideo prints "Recording started" once frames flow.
    for i in $(seq 1 50); do grep -q -i "recording started" "$OUT/$name.rec.log" 2>/dev/null && break; sleep 0.1; done
    t_rec=$(python3 -c "print(max($t_rec, $(now) - 0.05))")
    sleep 0.8
    t_go=$(now)
    echo go > "$DOCS/clip-go"

    if wait_file clip-done "$budget"; then ok=1; fi
    sleep 0.6
    kill -INT "$rec" 2>/dev/null || true
    wait "$rec" 2>/dev/null || true
    [ $ok = 1 ] && break
    echo "  $name never finished (try $try)"
  done
  if [ $ok != 1 ]; then echo "::warning::$name failed"; failed=$((failed+1)); continue; fi
  cp "$DOCS/clip-timeline.json" "$OUT/$name.timeline.json"
  python3 -c "import json; json.dump({'goOffset': round($t_go - $t_rec, 3)}, open('$OUT/$name.meta.json','w'))"
  xcrun simctl spawn "$udid" log show --last 2m --style compact \
    --predicate 'process == "Lock" AND (eventMessage CONTAINS[c] "clip" OR eventMessage CONTAINS[c] "warn" OR eventMessage CONTAINS[c] "error")' \
    > "$OUT/$name.app.log" 2>/dev/null || true
  echo "  $name ✓ ($(cat "$OUT/$name.timeline.json"))"
done <<< "$jobs"

xcrun simctl terminate "$udid" "$BUNDLE" >/dev/null 2>&1 || true
xcrun simctl shutdown "$udid" || true
ls -la "$OUT"
# Compose whatever was recorded; only fail when nothing was.
[ "$failed" = 0 ] || echo "::warning::$failed video(s) failed to record"
ls "$OUT"/*.timeline.json >/dev/null 2>&1 || { echo "::error::Nothing was recorded"; exit 1; }
