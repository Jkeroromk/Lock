/** Answers to the onboarding question "How did you hear about Kero Lock?". Keep in sync with the app's constants/acquisition.ts. */
export const ACQUISITION_SOURCES = [
  'app_store', 'tiktok', 'xiaohongshu', 'instagram', 'youtube', 'reddit', 'friend', 'website', 'other',
] as const;
export type AcquisitionSource = (typeof ACQUISITION_SOURCES)[number];

export function cleanAcquisitionSource(v: unknown): AcquisitionSource | undefined {
  return typeof v === 'string' && (ACQUISITION_SOURCES as readonly string[]).includes(v) ? (v as AcquisitionSource) : undefined;
}
