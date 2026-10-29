#!/usr/bin/env node
// Small fixes to native code in node_modules, applied on every `npm ci`
// (package.json "postinstall"). Each patch is idempotent and fails the install
// loudly if the library changed and the patch no longer applies.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const patches = [
  {
    // react-native-health 1.19 (unmaintained) calls -[RCTCallableJSModules
    // setBridge:], removed in React Native 0.88, so the iOS build fails. It is
    // only used to send HealthKit observer events to JS, which Lock never
    // subscribes to (services/health.ts only reads steps and active energy).
    file: 'node_modules/react-native-health/RCTAppleHealthKit/RCTAppleHealthKit.m',
    find: '    self.callableJSModules = [RCTAppleHealthKit sharedJsModule];\n    [self.callableJSModules setBridge:self.bridge];\n',
    replace: '    // Lock patch (scripts/patch-native-libs.mjs): setBridge: was removed in RN 0.88.\n',
  },
];

let failed = false;
for (const p of patches) {
  const path = join(root, p.file);
  if (!existsSync(path)) {
    console.log(`[patch-native-libs] skip (not installed): ${p.file}`);
    continue;
  }
  const src = readFileSync(path, 'utf8');
  if (src.includes(p.replace)) {
    console.log(`[patch-native-libs] already patched: ${p.file}`);
  } else if (src.includes(p.find)) {
    writeFileSync(path, src.replace(p.find, p.replace));
    console.log(`[patch-native-libs] patched: ${p.file}`);
  } else {
    console.error(`[patch-native-libs] patch no longer applies: ${p.file}`);
    failed = true;
  }
}
if (failed) process.exit(1);
