#!/usr/bin/env node
/**
 * Keep only the newest N TestFlight builds; expire the rest.
 *
 * Runs at the end of .eas/workflows/testflight.yml. Apple doesn't allow
 * deleting builds, so "expire" is the closest thing: expired builds disappear
 * from testers' TestFlight and can't be installed.
 *
 * Env (set as EAS environment variables, "production" environment):
 *   ASC_KEY_ID        App Store Connect API key ID          (secret)
 *   ASC_ISSUER_ID     API issuer ID                          (secret)
 *   ASC_PRIVATE_KEY   the .p8 key: an EAS *file* variable (its value is a path
 *                     to the file), the raw PEM text, or base64 of it (secret)
 *   ASC_APP_ID        optional, defaults to the app in eas.json
 *   TESTFLIGHT_KEEP   optional, defaults to 3
 *   NEW_BUILD_NUMBER  optional; if set, wait for this build to show up first
 *
 * Never fails the workflow: problems are logged and the script exits 0.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';

const API = 'https://api.appstoreconnect.apple.com/v1';
const APP_ID = process.env.ASC_APP_ID || '6762630080';
const KEEP = Math.max(1, parseInt(process.env.TESTFLIGHT_KEEP || '3', 10));
const NEW_BUILD = process.env.NEW_BUILD_NUMBER || '';

function privateKey() {
  let raw = (process.env.ASC_PRIVATE_KEY || '').trim();
  // EAS "file" variables are exposed as a path to the uploaded file.
  if (raw && !raw.includes('BEGIN') && fs.existsSync(raw)) raw = fs.readFileSync(raw, 'utf8').trim();
  if (raw.includes('BEGIN PRIVATE KEY')) return raw.replace(/\\n/g, '\n');
  const decoded = Buffer.from(raw, 'base64').toString('utf8');
  return decoded.includes('BEGIN PRIVATE KEY') ? decoded : '';
}

function token() {
  const b64url = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: 'ES256', kid: process.env.ASC_KEY_ID, typ: 'JWT' });
  const payload = b64url({ iss: process.env.ASC_ISSUER_ID, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' });
  const sig = crypto.sign('sha256', Buffer.from(`${header}.${payload}`), { key: privateKey(), dsaEncoding: 'ieee-p1363' });
  return `${header}.${payload}.${sig.toString('base64url')}`;
}

async function asc(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${path} → ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const listBuilds = async () =>
  (await asc(`/builds?filter[app]=${APP_ID}&sort=-uploadedDate&limit=100&fields[builds]=version,uploadedDate,expired,processingState`)).data;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!process.env.ASC_KEY_ID || !process.env.ASC_ISSUER_ID || !privateKey()) {
    console.log('[testflight-cleanup] ASC_KEY_ID / ASC_ISSUER_ID / ASC_PRIVATE_KEY missing or unreadable — skipping.');
    return;
  }

  let builds = await listBuilds();

  // The build we just submitted can take a few minutes to appear. Wait for it
  // (up to ~15 min) so it counts as one of the builds we keep.
  if (NEW_BUILD) {
    for (let i = 0; i < 30 && !builds.some((b) => b.attributes.version === NEW_BUILD); i++) {
      console.log(`[testflight-cleanup] waiting for build ${NEW_BUILD} to appear…`);
      await sleep(30_000);
      builds = await listBuilds();
    }
  }

  const active = builds.filter((b) => !b.attributes.expired);
  const keep = active.slice(0, KEEP);
  const expire = active.slice(KEEP);
  console.log(`[testflight-cleanup] keeping: ${keep.map((b) => b.attributes.version).join(', ') || 'none'}`);

  for (const b of expire) {
    try {
      await asc(`/builds/${b.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ data: { type: 'builds', id: b.id, attributes: { expired: true } } }),
      });
      console.log(`[testflight-cleanup] expired build ${b.attributes.version}`);
    } catch (err) {
      console.log(`[testflight-cleanup] could not expire ${b.attributes.version}: ${err.message}`);
    }
  }
  if (!expire.length) console.log('[testflight-cleanup] nothing to expire.');
}

main().catch((err) => {
  console.log(`[testflight-cleanup] skipped: ${err.message}`);
});
