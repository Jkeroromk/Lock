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
