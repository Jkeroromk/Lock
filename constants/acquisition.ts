/** Answers to the onboarding question "How did you hear about Kero Lock?". Keep in sync with backend/lib/acquisition.ts. */
export const ACQUISITION_SOURCES = [
  'app_store', 'tiktok', 'xiaohongshu', 'instagram', 'youtube', 'reddit', 'friend', 'website', 'other',
] as const;
export type AcquisitionSource = (typeof ACQUISITION_SOURCES)[number];

export const ACQUISITION_ICONS: Record<AcquisitionSource, string> = {
  app_store: 'search',
  tiktok: 'musical-notes',
  xiaohongshu: 'book',
  instagram: 'logo-instagram',
  youtube: 'logo-youtube',
  reddit: 'logo-reddit',
  friend: 'people',
  website: 'globe-outline',
  other: 'ellipsis-horizontal',
};

/**
 * Kero Lock on the App Store, for invite messages. pt/ct make it an App Store
 * campaign link, so installs from invites show up under Analytics → Campaigns.
 */
export const APP_STORE_URL = 'https://apps.apple.com/app/apple-store/id6762630080?pt=128801549&ct=invite&mt=8';
