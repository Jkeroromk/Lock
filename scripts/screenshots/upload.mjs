// Uploads the posters to App Store Connect, replacing the screenshots of the
// version that's being prepared. If that version is waiting for review, it is
// taken out of review first and submitted again once the new screenshots
// have processed (it goes back to the end of the review queue).
//
//   node scripts/screenshots/upload.mjs <posters dir> [version]
//
// <posters>/<locale>/<device>/NN-*.jpg, locale = en-US | zh-Hans,
// device = iphone69 → APP_IPHONE_67, duo → APP_IPHONE_DUO.
// The old APP_IPHONE_61 set (raw TestFlight captures) is emptied, so smaller
// iPhones fall back to the new 6.9" posters.
// Env: ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY (.p8 contents, raw or base64).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const APP_ID = '6762630080';
const [dir, versionArg] = process.argv.slice(2);
if (!dir) throw new Error('usage: upload.mjs <posters dir> [version]');
const version = versionArg || JSON.parse(fs.readFileSync('app.json', 'utf8')).expo.version;
const TYPES = { iphone69: 'APP_IPHONE_67', duo: 'APP_IPHONE_DUO' };
const EMPTY = ['APP_IPHONE_61'];
const EDITABLE = ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED'];
const WITHDRAWABLE = ['WAITING_FOR_REVIEW'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function token() {
  let key = process.env.ASC_PRIVATE_KEY ?? '';
  if (!key.includes('BEGIN')) key = Buffer.from(key, 'base64').toString('utf8');
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'ES256', kid: process.env.ASC_KEY_ID, typ: 'JWT' });
  const body = b64({ iss: process.env.ASC_ISSUER_ID, iat: now, exp: now + 1100, aud: 'appstoreconnect-v1' });
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${head}.${body}.${sig}`;
}

async function asc(method, url, body) {
  const res = await fetch(url.startsWith('http') ? url : `https://api.appstoreconnect.apple.com${url}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status} ${text.slice(0, 600)}`);
  return text ? JSON.parse(text) : null;
}

async function getVersion() {
  const versions = await asc('GET', `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&filter[versionString]=${version}&limit=5`);
  const v = versions.data[0];
  if (!v) throw new Error(`No iOS version ${version}`);
  return { v, state: v.attributes.appVersionState ?? v.attributes.appStoreState };
}

let { v, state } = await getVersion();
let resubmit = false;
if (WITHDRAWABLE.includes(state)) {
  const subs = (await asc('GET', `/v1/apps/${APP_ID}/reviewSubmissions?filter[platform]=IOS&filter[state]=WAITING_FOR_REVIEW&limit=5`)).data;
  if (!subs.length) throw new Error(`Version ${version} is ${state} but no waiting review submission was found`);
  for (const sub of subs) {
    await asc('PATCH', `/v1/reviewSubmissions/${sub.id}`, { data: { type: 'reviewSubmissions', id: sub.id, attributes: { canceled: true } } });
    console.log(`Took review submission ${sub.id} out of review`);
  }
  resubmit = true;
  for (let i = 0; i < 60 && !EDITABLE.includes(state); i++) {
    await sleep(10_000);
    ({ v, state } = await getVersion());
  }
  console.log(`Version ${version} is now ${state}`);
}
if (!EDITABLE.includes(state)) {
  console.log(`::warning::Version ${version} is ${state}; screenshots can't change now.`);
  process.exit(0);
}
const locs = (await asc('GET', `/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations?limit=50`)).data;

for (const loc of locs) {
  const locale = loc.attributes.locale;
  const localeDir = path.join(dir, locale);
  if (!fs.existsSync(localeDir)) { console.log(`skip ${locale} (no posters)`); continue; }
  const sets = (await asc('GET', `/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets?limit=50`)).data;

  for (const type of EMPTY) {
    const set = sets.find((s) => s.attributes.screenshotDisplayType === type);
    if (!set) continue;
    const shots = (await asc('GET', `/v1/appScreenshotSets/${set.id}/appScreenshots?limit=50`)).data;
    for (const s of shots) await asc('DELETE', `/v1/appScreenshots/${s.id}`);
    console.log(`${locale} ${type}: removed ${shots.length}`);
  }

  for (const [device, type] of Object.entries(TYPES)) {
    const files = fs.existsSync(path.join(localeDir, device))
      ? fs.readdirSync(path.join(localeDir, device)).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort()
      : [];
    if (!files.length) continue;
    let set = sets.find((s) => s.attributes.screenshotDisplayType === type);
    if (!set) {
      set = (await asc('POST', '/v1/appScreenshotSets', {
        data: { type: 'appScreenshotSets', attributes: { screenshotDisplayType: type },
          relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: loc.id } } } },
      })).data;
    }
    const old = (await asc('GET', `/v1/appScreenshotSets/${set.id}/appScreenshots?limit=50`)).data;
    for (const s of old) await asc('DELETE', `/v1/appScreenshots/${s.id}`);

    const ids = [];
    for (const f of files) {
      const buf = fs.readFileSync(path.join(localeDir, device, f));
      const shot = (await asc('POST', '/v1/appScreenshots', {
        data: { type: 'appScreenshots', attributes: { fileName: f, fileSize: buf.length },
          relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: set.id } } } },
      })).data;
      for (const op of shot.attributes.uploadOperations) {
        const r = await fetch(op.url, {
          method: op.method,
          headers: Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value])),
          body: buf.subarray(op.offset, op.offset + op.length),
        });
        if (!r.ok) throw new Error(`upload ${f} → ${r.status}`);
      }
      await asc('PATCH', `/v1/appScreenshots/${shot.id}`, {
        data: { type: 'appScreenshots', id: shot.id,
          attributes: { uploaded: true, sourceFileChecksum: crypto.createHash('md5').update(buf).digest('hex') } },
      });
      ids.push(shot.id);
    }
    await asc('PATCH', `/v1/appScreenshotSets/${set.id}/relationships/appScreenshots`, {
      data: ids.map((id) => ({ type: 'appScreenshots', id })),
    });
    console.log(`${locale} ${type}: uploaded ${ids.length}`);
  }
}

// Apple processes uploads asynchronously: wait until every screenshot is
// COMPLETE, and stop on anything it rejected.
let failed = 0;
for (let i = 0; i < 40; i++) {
  await sleep(15_000);
  failed = 0;
  let pending = 0;
  for (const loc of locs) {
    const sets = (await asc('GET', `/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets?limit=50`)).data;
    for (const set of sets) {
      const shots = (await asc('GET', `/v1/appScreenshotSets/${set.id}/appScreenshots?limit=50`)).data;
      for (const s of shots) {
        const st = s.attributes.assetDeliveryState?.state;
        if (st === 'FAILED') {
          failed++;
          console.log(`::error::${loc.attributes.locale} ${set.attributes.screenshotDisplayType} ${s.attributes.fileName}: ${JSON.stringify(s.attributes.assetDeliveryState.errors)}`);
        } else if (st !== 'COMPLETE') pending++;
      }
    }
  }
  console.log(`processing: ${pending} pending, ${failed} failed`);
  if (failed || !pending) break;
}
if (failed) process.exit(1);

if (resubmit) {
  // Reuse an unsubmitted draft submission if App Store Connect kept one.
  let sub = (await asc('GET', `/v1/apps/${APP_ID}/reviewSubmissions?filter[platform]=IOS&filter[state]=READY_FOR_REVIEW&limit=5`)).data[0];
  if (!sub) {
    sub = (await asc('POST', '/v1/reviewSubmissions', {
      data: { type: 'reviewSubmissions', attributes: { platform: 'IOS' },
        relationships: { app: { data: { type: 'apps', id: APP_ID } } } },
    })).data;
  }
  const items = (await asc('GET', `/v1/reviewSubmissions/${sub.id}/items?include=appStoreVersion&limit=20`)).data;
  if (!items.some((it) => it.relationships?.appStoreVersion?.data?.id === v.id)) {
    await asc('POST', '/v1/reviewSubmissionItems', {
      data: { type: 'reviewSubmissionItems',
        relationships: { reviewSubmission: { data: { type: 'reviewSubmissions', id: sub.id } },
          appStoreVersion: { data: { type: 'appStoreVersions', id: v.id } } } },
    });
  }
  await asc('PATCH', `/v1/reviewSubmissions/${sub.id}`, { data: { type: 'reviewSubmissions', id: sub.id, attributes: { submitted: true } } });
  ({ state } = await getVersion());
  console.log(`Submitted ${version} for review again (${state})`);
}
console.log('Done.');
