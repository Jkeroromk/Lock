#!/usr/bin/env bash
# Copies a folder into the android-output branch (android-output/<dest>/) and
# pushes it, retrying when another job pushed first. Old contents of <dest>
# are replaced. Usage: scripts/android/publish-output.sh <srcdir> <dest>
set -eu
SRC=$1; DEST=$2
repo="https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
work="$RUNNER_TEMP/android-output"
for attempt in 1 2 3 4 5; do
  rm -rf "$work"
  if git ls-remote --exit-code --heads "$repo" android-output >/dev/null; then
    git clone -q --depth 1 --branch android-output "$repo" "$work"
  else
    git init -q "$work"; git -C "$work" checkout -q --orphan android-output
    git -C "$work" remote add origin "$repo"
  fi
  rm -rf "${work:?}/$DEST"; mkdir -p "$work/$DEST"; cp -R "$SRC"/. "$work/$DEST/"
  cd "$work"
  git config user.name "github-actions[bot]"; git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  git add -A
  git commit -q -m "$DEST from ${GITHUB_SHA::7}" || { echo "nothing to publish"; exit 0; }
  if git push -q origin HEAD:android-output; then echo "published to android-output/$DEST"; exit 0; fi
  cd - >/dev/null; sleep $((attempt * 5))
done
echo "::error::could not push android-output"; exit 1
