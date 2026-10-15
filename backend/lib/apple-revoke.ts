import { createPrivateKey, sign } from 'node:crypto';

/**
 * Sign in with Apple token revocation, required by App Store guideline
 * 5.1.1(v) when a user deletes their account.
 *
 * Flow: the app asks Apple for a fresh authorization code right before
 * deleting the account; we exchange it for a refresh token and revoke that,
 * which removes Lock from the user's "Sign in with Apple" list.
 *
 * Env (Vercel):
 *   APPLE_TEAM_ID       Apple Developer Team ID
 *   APPLE_KEY_ID        Key ID of a key with "Sign in with Apple" enabled
 *   APPLE_PRIVATE_KEY   contents of that .p8 file
 *   APPLE_CLIENT_ID     optional, defaults to the iOS bundle ID
 */
const CLIENT_ID = process.env.APPLE_CLIENT_ID || 'com.jkeroro.lockin';

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

export function appleRevokeConfigured(): boolean {
  return !!(process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY);
}

/** ES256 client secret JWT, valid for 5 minutes. */
function clientSecret(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: process.env.APPLE_KEY_ID };
  const payload = {
    iss: process.env.APPLE_TEAM_ID,
    iat: now,
    exp: now + 300,
    aud: 'https://appleid.apple.com',
    sub: CLIENT_ID,
  };
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const pem = (process.env.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const signature = sign('sha256', Buffer.from(data), {
    key: createPrivateKey(pem),
    dsaEncoding: 'ieee-p1363',
  });
  return `${data}.${b64url(signature)}`;
}

async function post(path: string, body: Record<string, string>) {
  return fetch(`https://appleid.apple.com${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });
}

/**
 * Exchanges the authorization code and revokes the resulting token.
 * Never throws; returns whether Apple accepted the revocation.
 */
export async function revokeAppleAuthorization(authorizationCode: string): Promise<boolean> {
  if (!appleRevokeConfigured()) {
    console.warn('[apple-revoke] APPLE_* env not set; skipping revocation');
    return false;
  }
  try {
    const secret = clientSecret();
    const tokenRes = await post('/auth/token', {
      client_id: CLIENT_ID,
      client_secret: secret,
      code: authorizationCode,
      grant_type: 'authorization_code',
    });
    if (!tokenRes.ok) {
      console.error('[apple-revoke] token exchange failed', tokenRes.status, await tokenRes.text());
      return false;
    }
    const tokens = (await tokenRes.json()) as { refresh_token?: string; access_token?: string };
    const token = tokens.refresh_token ?? tokens.access_token;
    if (!token) return false;

    const revokeRes = await post('/auth/revoke', {
      client_id: CLIENT_ID,
      client_secret: secret,
      token,
      token_type_hint: tokens.refresh_token ? 'refresh_token' : 'access_token',
    });
    if (!revokeRes.ok) {
      console.error('[apple-revoke] revoke failed', revokeRes.status, await revokeRes.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[apple-revoke] error', err);
    return false;
  }
}
