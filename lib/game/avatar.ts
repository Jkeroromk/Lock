/** Avatar options. Keep in sync with backend/lib/game/avatar.ts and game/engine.html. */
export const AVATAR_OPTIONS = {
  gender: ['boy', 'girl'],
  skin: ['light', 'pale', 'tan', 'deep'],
  hair: ['short', 'spiky', 'buzz', 'long', 'pony', 'bun'],
  hairColor: ['black', 'brown', 'blonde', 'pink', 'blue', 'silver'],
  top: ['yellow', 'white', 'black', 'red', 'blue', 'green', 'gold'],
  bottom: ['pants', 'shorts', 'skirt'],
  bottomColor: ['denim', 'black', 'khaki', 'pink'],
  acc: ['none', 'glasses', 'headband', 'cap', 'headphones', 'crown'],
} as const;

export type AvatarField = keyof typeof AVATAR_OPTIONS;
export type AvatarLook = { [K in AvatarField]: (typeof AVATAR_OPTIONS)[K][number] };

export const DEFAULT_LOOK: AvatarLook = { gender: 'boy', skin: 'light', hair: 'short', hairColor: 'black', top: 'yellow', bottom: 'pants', bottomColor: 'denim', acc: 'none' };
export const DEFAULT_GIRL: Partial<AvatarLook> = { gender: 'girl', hair: 'long', hairColor: 'brown', bottom: 'skirt', bottomColor: 'pink' };

/** Days with a logged meal → an unlocked item (same order as the server). */
export const MILESTONES: { days: number; field: AvatarField; value: string }[] = [
  { days: 3, field: 'acc', value: 'cap' },
  { days: 7, field: 'acc', value: 'headphones' },
  { days: 14, field: 'acc', value: 'crown' },
  { days: 30, field: 'top', value: 'gold' },
];

/** Swatch colours for the editor (the engine has the full shading ramps). */
export const SWATCH: Record<string, string> = {
  'skin.light': '#f6c9a6', 'skin.pale': '#ffe3d6', 'skin.tan': '#c98656', 'skin.deep': '#83513a',
  'hairColor.black': '#252736', 'hairColor.brown': '#77452a', 'hairColor.blonde': '#f2c84e', 'hairColor.pink': '#ee86a8', 'hairColor.blue': '#52a6ec', 'hairColor.silver': '#b9c2dc',
  'top.yellow': '#ffcf3a', 'top.white': '#f1eff7', 'top.black': '#2c2e3e', 'top.red': '#de503e', 'top.blue': '#52a6ec', 'top.green': '#40a64e', 'top.gold': '#eab426',
  'bottomColor.denim': '#2d5a9a', 'bottomColor.black': '#2c2e3e', 'bottomColor.khaki': '#d6ae67', 'bottomColor.pink': '#ee86a8',
};
