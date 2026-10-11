import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Downscale + JPEG-compress a local image and return it as base64.
 *
 * Camera photos are 3–7 MB once base64-encoded, which is over Vercel's 4.5 MB
 * request-body limit (requests are rejected before reaching our API) and far
 * more than the AI or a profile picture needs.
 */
export async function toCompressedBase64(
  uri: string,
  { maxWidth, quality = 0.7 }: { maxWidth: number; quality?: number }
): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  if (!result.base64) throw new Error('Image compression failed');
  return result.base64;
}

/**
 * Makes a small meal-photo thumbnail: keeps a copy in the app's documents
 * folder (instant display on this device) and returns it as base64 for the
 * server, which stores it in Supabase Storage so it shows on every device.
 * Returns null if anything goes wrong — the meal still saves without a photo.
 */
export async function makeMealThumbnail(uri: string): Promise<{ uri: string; base64: string } | null> {
  try {
    // Lazy so the module only loads when a photo is actually saved.
    const FileSystem = require('expo-file-system/legacy');
    const small = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 320 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    if (!small.base64) return null;
    const dir = `${FileSystem.documentDirectory}meals/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
    const dest = `${dir}${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: small.uri, to: dest });
    return { uri: dest, base64: small.base64 };
  } catch {
    return null;
  }
}
