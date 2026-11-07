/**
 * Furniture styles for the couple room (prices and ownership live on the
 * server: backend/lib/coupleHome.ts — the ids must match).
 *
 * Each room slot shows one style. The room's furniture is Tripo-made plush
 * (components/couple/room/plush.ts): a style tints that one model (`tint`, and
 * the plant can grow flowers or oranges). `look` colours the toon furniture the
 * room shows until the plush models have loaded (or if they can't).
 */

export const HOME_SLOTS = ['sofa', 'rug', 'wall', 'floor', 'lamp', 'plant', 'bed', 'table'] as const;
export type HomeSlot = (typeof HOME_SLOTS)[number];

export interface SofaLook { seat: string; back: string; pillow: string }
export interface RugLook { outer: string; inner: string }
export interface TintLook { tint: string }
export interface LampLook { shade: string; light: string }
export interface PlantLook { leaves: string; extra: 'none' | 'flowers' | 'oranges' }
export interface BedLook { ring: string; inside: string }
export interface TableLook { top: string; leg: string }

export interface LookBySlot {
  sofa: SofaLook; rug: RugLook; wall: TintLook; floor: TintLook;
  lamp: LampLook; plant: PlantLook; bed: BedLook; table: TableLook;
}

export interface HomeItem<S extends HomeSlot = HomeSlot> {
  id: string;
  slot: S;
  price: number;
  name: { zh: string; en: string };
  /** Shop swatch colours. */
  swatch: [string, string];
  /** The plush room: this colour multiplied over the model's own texture (white = as made). */
  tint: string;
  look: LookBySlot[S];
}

const item = <S extends HomeSlot>(i: HomeItem<S>) => i;

export const HOME_ITEMS: HomeItem[] = [
  item({ id: 'sofa_blue', slot: 'sofa', price: 0, name: { zh: '蓝色沙发', en: 'Blue sofa' }, swatch: ['#7FB8E8', '#5E9AD0'], tint: '#A9CBEF', look: { seat: '#7FB8E8', back: '#5E9AD0', pillow: '#FFD43B' } }),
  item({ id: 'sofa_pink', slot: 'sofa', price: 200, name: { zh: '樱花粉沙发', en: 'Blossom sofa' }, swatch: ['#FFB3C1', '#F28AA0'], tint: '#FFC2CE', look: { seat: '#FFB3C1', back: '#F28AA0', pillow: '#FFFFFF' } }),
  item({ id: 'sofa_mint', slot: 'sofa', price: 200, name: { zh: '薄荷绿沙发', en: 'Mint sofa' }, swatch: ['#9FDDB8', '#6CC27A'], tint: '#B7E5C6', look: { seat: '#9FDDB8', back: '#6CC27A', pillow: '#FFD43B' } }),
  item({ id: 'sofa_cream', slot: 'sofa', price: 300, name: { zh: '奶油沙发', en: 'Cream sofa' }, swatch: ['#F5E6C8', '#C77B4A'], tint: '#FFFFFF', look: { seat: '#F5E6C8', back: '#C77B4A', pillow: '#FF8FA3' } }),

  item({ id: 'rug_yellow', slot: 'rug', price: 0, name: { zh: '黄色圆地毯', en: 'Yellow rug' }, swatch: ['#FFD43B', '#FFE58A'], tint: '#FFE07A', look: { outer: '#FFD43B', inner: '#FFE58A' } }),
  item({ id: 'rug_pink', slot: 'rug', price: 150, name: { zh: '粉色圆地毯', en: 'Pink rug' }, swatch: ['#FF8FA3', '#FFD0DA'], tint: '#FFB8C6', look: { outer: '#FF8FA3', inner: '#FFD0DA' } }),
  item({ id: 'rug_blue', slot: 'rug', price: 150, name: { zh: '天蓝圆地毯', en: 'Sky rug' }, swatch: ['#4DB6FF', '#BFE6FF'], tint: '#A8D8FF', look: { outer: '#4DB6FF', inner: '#BFE6FF' } }),
  item({ id: 'rug_mint', slot: 'rug', price: 150, name: { zh: '薄荷圆地毯', en: 'Mint rug' }, swatch: ['#6CC27A', '#C8EBC9'], tint: '#B5E3BC', look: { outer: '#6CC27A', inner: '#C8EBC9' } }),

  item({ id: 'wall_cream', slot: 'wall', price: 0, name: { zh: '奶黄墙纸', en: 'Cream wallpaper' }, swatch: ['#FFF1BF', '#F5DFA0'], tint: '#FFFFFF', look: { tint: '#FFFFFF' } }),
  item({ id: 'wall_pink', slot: 'wall', price: 250, name: { zh: '粉色墙纸', en: 'Pink wallpaper' }, swatch: ['#FFD9E2', '#F7B9C8'], tint: '#FFD3DE', look: { tint: '#FFD3DE' } }),
  item({ id: 'wall_mint', slot: 'wall', price: 250, name: { zh: '薄荷墙纸', en: 'Mint wallpaper' }, swatch: ['#D5F2DD', '#A9DDB8'], tint: '#D2F0DA', look: { tint: '#D2F0DA' } }),
  item({ id: 'wall_sky', slot: 'wall', price: 250, name: { zh: '天蓝墙纸', en: 'Sky wallpaper' }, swatch: ['#D6ECFF', '#A9D2F5'], tint: '#D3E9FF', look: { tint: '#D3E9FF' } }),

  item({ id: 'floor_oak', slot: 'floor', price: 0, name: { zh: '橡木地板', en: 'Oak floor' }, swatch: ['#EBD5A6', '#E2C68F'], tint: '#FFFFFF', look: { tint: '#FFFFFF' } }),
  item({ id: 'floor_walnut', slot: 'floor', price: 300, name: { zh: '胡桃木地板', en: 'Walnut floor' }, swatch: ['#B98A5E', '#9C6F47'], tint: '#B98A5E', look: { tint: '#B98A5E' } }),
  item({ id: 'floor_rose', slot: 'floor', price: 300, name: { zh: '玫瑰木地板', en: 'Rosewood floor' }, swatch: ['#F2C9C0', '#E0AFA3'], tint: '#F7CFC7', look: { tint: '#F7CFC7' } }),

  item({ id: 'lamp_cream', slot: 'lamp', price: 0, name: { zh: '奶白落地灯', en: 'Cream lamp' }, swatch: ['#FFF1BF', '#0A0A0A'], tint: '#FFFFFF', look: { shade: '#FFF1BF', light: '#FFD98A' } }),
  item({ id: 'lamp_pink', slot: 'lamp', price: 150, name: { zh: '粉色落地灯', en: 'Pink lamp' }, swatch: ['#FFC7D3', '#0A0A0A'], tint: '#FFC7D3', look: { shade: '#FFC7D3', light: '#FFB7C6' } }),
  item({ id: 'lamp_blue', slot: 'lamp', price: 150, name: { zh: '蓝色落地灯', en: 'Blue lamp' }, swatch: ['#CFE8FF', '#0A0A0A'], tint: '#CFE8FF', look: { shade: '#CFE8FF', light: '#C4E1FF' } }),

  item({ id: 'plant_green', slot: 'plant', price: 0, name: { zh: '绿植', en: 'Green plant' }, swatch: ['#6CC27A', '#C77B4A'], tint: '#FFFFFF', look: { leaves: '#6CC27A', extra: 'none' } }),
  item({ id: 'plant_flowers', slot: 'plant', price: 200, name: { zh: '开花盆栽', en: 'Flowering plant' }, swatch: ['#FF8FA3', '#6CC27A'], tint: '#FFFFFF', look: { leaves: '#6CC27A', extra: 'flowers' } }),
  item({ id: 'plant_orange', slot: 'plant', price: 250, name: { zh: '小橘子树', en: 'Little orange tree' }, swatch: ['#FFA53B', '#4FA65F'], tint: '#DCEFB0', look: { leaves: '#4FA65F', extra: 'oranges' } }),

  item({ id: 'bed_pink', slot: 'bed', price: 0, name: { zh: '粉色狗窝', en: 'Pink dog bed' }, swatch: ['#FF8FA3', '#FFE0E6'], tint: '#FFB3C1', look: { ring: '#FF8FA3', inside: '#FFE0E6' } }),
  item({ id: 'bed_blue', slot: 'bed', price: 120, name: { zh: '蓝色狗窝', en: 'Blue dog bed' }, swatch: ['#4DB6FF', '#D6ECFF'], tint: '#A8D4FF', look: { ring: '#4DB6FF', inside: '#D6ECFF' } }),
  item({ id: 'bed_yellow', slot: 'bed', price: 120, name: { zh: '黄色狗窝', en: 'Yellow dog bed' }, swatch: ['#FFD43B', '#FFF1BF'], tint: '#FFE07A', look: { ring: '#FFD43B', inside: '#FFF1BF' } }),

  item({ id: 'table_white', slot: 'table', price: 0, name: { zh: '原木圆桌', en: 'Natural table' }, swatch: ['#F2B36B', '#D98A3D'], tint: '#FFFFFF', look: { top: '#FFFFFF', leg: '#C77B4A' } }),
  item({ id: 'table_wood', slot: 'table', price: 150, name: { zh: '胡桃木圆桌', en: 'Walnut table' }, swatch: ['#A8714A', '#7A4E30'], tint: '#B07E58', look: { top: '#D9A066', leg: '#8A5A35' } }),
  item({ id: 'table_black', slot: 'table', price: 150, name: { zh: '乌木圆桌', en: 'Ebony table' }, swatch: ['#5A4A44', '#2B2422'], tint: '#4E4644', look: { top: '#2B2B2B', leg: '#0A0A0A' } }),
];

export const HOME_ITEM = Object.fromEntries(HOME_ITEMS.map((i) => [i.id, i])) as Record<string, HomeItem>;

export const HOME_DEFAULTS: Record<HomeSlot, string> = {
  sofa: 'sofa_blue', rug: 'rug_yellow', wall: 'wall_cream', floor: 'floor_oak',
  lamp: 'lamp_cream', plant: 'plant_green', bed: 'bed_pink', table: 'table_white',
};

/** Equipped item per slot, filling defaults and ignoring unknown ids. */
export function equippedLooks(equipped: Record<string, string> | null | undefined): Record<HomeSlot, string> {
  const out = { ...HOME_DEFAULTS };
  for (const slot of HOME_SLOTS) {
    const id = equipped?.[slot];
    if (id && HOME_ITEM[id]?.slot === slot) out[slot] = id;
  }
  return out;
}
