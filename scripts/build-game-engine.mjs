// Turns game/engine.html into lib/game/engineHtml.ts (a string the WebView loads).
// Run after editing the engine: node scripts/build-game-engine.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const html = readFileSync(new URL('../game/engine.html', import.meta.url), 'utf8');
const out = `// Generated from game/engine.html by scripts/build-game-engine.mjs. Do not edit by hand.\nexport const ENGINE_HTML = ${JSON.stringify(html)};\n`;
writeFileSync(new URL('../lib/game/engineHtml.ts', import.meta.url), out);
console.log(`lib/game/engineHtml.ts: ${(out.length / 1024).toFixed(1)} KB`);
