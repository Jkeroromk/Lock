// Keeps the Swift files shared between the app, the Live Activity and the watch
// identical. `node scripts/sync-watch-model.mjs` copies them; `--check` only
// compares (used in CI).
import { readFileSync, writeFileSync } from 'node:fs';

const pairs = [
  ['modules/lock-workout/ios/WorkoutModel.swift', 'targets/watch/WorkoutModel.swift'],
  ['modules/lock-workout/ios/LockWorkoutAttributes.swift', 'targets/live/LockWorkoutAttributes.swift'],
];

const check = process.argv.includes('--check');
let bad = 0;
for (const [src, dst] of pairs) {
  const a = readFileSync(src, 'utf8');
  let b = '';
  try { b = readFileSync(dst, 'utf8'); } catch {}
  if (a === b) continue;
  if (check) {
    console.error(`${dst} differs from ${src}. Run: node scripts/sync-watch-model.mjs`);
    bad++;
  } else {
    writeFileSync(dst, a);
    console.log(`updated ${dst}`);
  }
}
process.exit(bad ? 1 : 0);
