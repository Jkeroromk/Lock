/**
 * Meal photo thumbnails in Supabase Storage (private bucket "meal-photos").
 *
 * Talks to the Storage REST API with the service-role key that the
 * Supabase ↔ Vercel integration provides (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY),
 * so no extra SDK is needed. Objects live at `<userId>/<mealId>.jpg`; the
 * database stores `sb://meal-photos/<path>` and readers get short-lived signed URLs.
 *
 * Everything here is best-effort: a storage hiccup never fails a meal save/read.
 */
const BUCKET = 'meal-photos';
const PREFIX = `sb://${BUCKET}/`;
/** Signed URLs last a week, so cached Today data keeps showing photos. */
const SIGNED_URL_TTL = 60 * 60 * 24 * 7;
/** ~375 KB of JPEG; the app sends ~20–40 KB thumbnails. */
export const MAX_THUMBNAIL_BASE64 = 500_000;

function config() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url && key ? { url, key } : null;
}

function headers(key: string, extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${key}`, apikey: key, ...extra };
}

export function isStoredPhoto(imageUrl: string | null | undefined): imageUrl is string {
  return !!imageUrl && imageUrl.startsWith(PREFIX);
}

/**
 * The storage path of a photo that belongs to `userId`, or null. Everything
 * here uses the service-role key, so a stored reference is only signed or
 * deleted when it points inside the owner's own folder: a meal row whose
 * image_url names someone else's photo must never reach it.
 */
function ownPath(imageUrl: string | null | undefined, userId: string): string | null {
  if (!isStoredPhoto(imageUrl)) return null;
  const path = imageUrl.slice(PREFIX.length);
  return /^[^/]+\/[^/]+\.jpg$/.test(path) && path.startsWith(`${userId}/`) ? path : null;
}

/** Uploads a base64 JPEG thumbnail; returns the value to store in meals.image_url, or null. */
export async function uploadMealPhoto(userId: string, mealId: string, base64: string): Promise<string | null> {
  const cfg = config();
  if (!cfg) return null;
  const path = `${userId}/${mealId}.jpg`;
  try {
    const body = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const res = await fetch(`${cfg.url}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: headers(cfg.key, { 'Content-Type': 'image/jpeg', 'x-upsert': 'true', 'Cache-Control': 'max-age=31536000' }),
      body,
    });
    if (!res.ok) {
      console.error('[meal-photos] upload failed', res.status, await res.text().catch(() => ''));
      return null;
    }
    return PREFIX + path;
  } catch (error) {
    console.error('[meal-photos] upload error', error);
    return null;
  }
}

/**
 * Replaces `sb://` references with signed URLs for `userId`'s own photos;
 * references to anyone else's folder become null. Other values are left alone.
 */
export async function signMealPhotos<T extends { image_url: string | null }>(rows: T[], userId: string): Promise<T[]> {
  const cfg = config();
  rows = rows.map((r) => (isStoredPhoto(r.image_url) && !ownPath(r.image_url, userId) ? ({ ...r, image_url: null } as T) : r));
  const paths = rows.map((r) => ownPath(r.image_url, userId)).filter((p): p is string => !!p);
  if (!cfg || paths.length === 0) return rows;
  try {
    const res = await fetch(`${cfg.url}/storage/v1/object/sign/${BUCKET}`, {
      method: 'POST',
      headers: headers(cfg.key, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ expiresIn: SIGNED_URL_TTL, paths }),
    });
    if (!res.ok) throw new Error(`sign ${res.status}`);
    const signed: { path: string; signedURL?: string | null; error?: string | null }[] = await res.json();
    const byPath = new Map(signed.filter((s) => s.signedURL).map((s) => [s.path, `${cfg.url}/storage/v1${s.signedURL}`]));
    return rows.map((r) => (isStoredPhoto(r.image_url)
      ? { ...r, image_url: byPath.get(r.image_url.slice(PREFIX.length)) ?? null }
      : r));
  } catch (error) {
    console.error('[meal-photos] sign error', error);
    return rows.map((r) => (isStoredPhoto(r.image_url) ? { ...r, image_url: null } : r));
  }
}

async function removePaths(paths: string[]): Promise<void> {
  const cfg = config();
  if (!cfg || paths.length === 0) return;
  try {
    await fetch(`${cfg.url}/storage/v1/object/${BUCKET}`, {
      method: 'DELETE',
      headers: headers(cfg.key, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prefixes: paths }),
    });
  } catch (error) {
    console.error('[meal-photos] delete error', error);
  }
}

/** Deletes one meal's photo (call after deleting the meal); only inside `userId`'s folder. */
export async function deleteMealPhoto(imageUrl: string | null | undefined, userId: string): Promise<void> {
  const path = ownPath(imageUrl, userId);
  if (path) await removePaths([path]);
}

/** Deletes every photo a user has (account deletion). */
export async function deleteAllMealPhotos(userId: string): Promise<void> {
  const cfg = config();
  if (!cfg) return;
  try {
    for (let round = 0; round < 20; round++) {
      const res = await fetch(`${cfg.url}/storage/v1/object/list/${BUCKET}`, {
        method: 'POST',
        headers: headers(cfg.key, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ prefix: userId, limit: 1000, offset: 0 }),
      });
      if (!res.ok) return;
      const items: { name: string }[] = await res.json();
      if (items.length === 0) return;
      await removePaths(items.map((i) => `${userId}/${i.name}`));
    }
  } catch (error) {
    console.error('[meal-photos] delete-all error', error);
  }
}
