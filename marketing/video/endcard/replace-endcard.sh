#!/usr/bin/env bash
# Swap the old "Lock·In" ending of a social video for the new Kero Lock end card.
#
#   ./replace-endcard.sh INPUT.mp4 OUTPUT.mp4 CUT_SECONDS [en|zh]
#
# CUT_SECONDS = how much of the old ending to drop (the old sting + end card).
# Scrub the old video to the frame where the old sting starts; CUT = total length - that time.
# Works with silent or voiced inputs; output is 1080x1920, 30 fps, H.264 + AAC.
set -euo pipefail

IN="$1"; OUT="$2"; CUT="$3"; LANG_="${4:-en}"
HERE="$(cd "$(dirname "$0")" && pwd)"
CARD="$HERE/out/endcard-$LANG_.mp4"
[ -f "$CARD" ] || { echo "Missing $CARD: run python3 render.py first" >&2; exit 1; }

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
KEEP=$(python3 -c "print(max(0.1, $DUR - $CUT))")
HAS_AUDIO=$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$IN" | head -1)

if [ -n "$HAS_AUDIO" ]; then
  SRC_A="[0:a]atrim=0:$KEEP,asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo[a0]"
  EXTRA=()
else
  SRC_A="[2:a]atrim=0:$KEEP,asetpts=PTS-STARTPTS[a0]"
  EXTRA=(-f lavfi -t "$KEEP" -i anullsrc=r=48000:cl=stereo)
fi

ffmpeg -y -loglevel error -i "$IN" -i "$CARD" "${EXTRA[@]}" -filter_complex "\
[0:v]trim=0:$KEEP,setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x0A0A0A,fps=30,setsar=1[v0];\
$SRC_A;\
[1:v]setsar=1[v1];[1:a]aformat=channel_layouts=stereo[a1];\
[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart "$OUT"

echo "$OUT ($(python3 -c "print(round($KEEP + 3.5, 2))") s)"
