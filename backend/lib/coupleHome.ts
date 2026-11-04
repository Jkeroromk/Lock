import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { keyOf } from '@/lib/couple';

/**
 * The couple's home (app: constants/coupleHome.ts, which has the looks).
 *
 * Both partners' daily growth (pet_days.xp — training, steps, meals, protein)
 * from the day they became a couple goes into one shared wallet. Either of
 * them can spend it on furniture styles; each room slot shows one style.
 * Every slot's default style is free and always owned.
 *
 * Prices live only here; the app's catalogue must use the same ids.
 */

export const SLOTS = ['sofa', 'rug', 'wall', 'floor', 'lamp', 'plant', 'bed', 'table'] as const;
export type Slot = (typeof SLOTS)[number];

interface Item { slot: Slot; price: number; name: string }
export const ITEMS: Record<string, Item> = {
  sofa_blue: { slot: 'sofa', price: 0, name: '蓝色沙发' },
  sofa_pink: { slot: 'sofa', price: 200, name: '樱花粉沙发' },
  sofa_mint: { slot: 'sofa', price: 200, name: '薄荷绿沙发' },
  sofa_cream: { slot: 'sofa', price: 300, name: '奶油沙发' },
  rug_yellow: { slot: 'rug', price: 0, name: '黄色圆地毯' },
  rug_pink: { slot: 'rug', price: 150, name: '粉色圆地毯' },
  rug_blue: { slot: 'rug', price: 150, name: '天蓝圆地毯' },
  rug_mint: { slot: 'rug', price: 150, name: '薄荷圆地毯' },
  wall_cream: { slot: 'wall', price: 0, name: '奶黄墙纸' },
  wall_pink: { slot: 'wall', price: 250, name: '粉色墙纸' },
  wall_mint: { slot: 'wall', price: 250, name: '薄荷墙纸' },
  wall_sky: { slot: 'wall', price: 250, name: '天蓝墙纸' },
  floor_oak: { slot: 'floor', price: 0, name: '橡木地板' },
  floor_walnut: { slot: 'floor', price: 300, name: '胡桃木地板' },
  floor_rose: { slot: 'floor', price: 300, name: '玫瑰木地板' },
  lamp_cream: { slot: 'lamp', price: 0, name: '奶白落地灯' },
  lamp_pink: { slot: 'lamp', price: 150, name: '粉色落地灯' },
  lamp_blue: { slot: 'lamp', price: 150, name: '蓝色落地灯' },
  plant_green: { slot: 'plant', price: 0, name: '绿植' },
  plant_flowers: { slot: 'plant', price: 200, name: '开花盆栽' },
  plant_orange: { slot: 'plant', price: 250, name: '小橘子树' },
  bed_pink: { slot: 'bed', price: 0, name: '粉色狗窝' },
  bed_blue: { slot: 'bed', price: 120, name: '蓝色狗窝' },
  bed_yellow: { slot: 'bed', price: 120, name: '黄色狗窝' },
  table_white: { slot: 'table', price: 0, name: '白色圆桌' },
  table_wood: { slot: 'table', price: 150, name: '原木圆桌' },
  table_black: { slot: 'table', price: 150, name: '黑色圆桌' },
};

export const DEFAULTS: Record<Slot, string> = {
  sofa: 'sofa_blue', rug: 'rug_yellow', wall: 'wall_cream', floor: 'floor_oak',
  lamp: 'lamp_cream', plant: 'plant_green', bed: 'bed_pink', table: 'table_white',
};

export const isItem = (id: unknown): id is string => typeof id === 'string' && Object.prototype.hasOwnProperty.call(ITEMS, id);

/** The equipped style per slot: what's stored, defaults for the rest, never an unknown id. */
export function equippedOf(room: unknown): Record<Slot, string> {
  const out = { ...DEFAULTS };
  if (room && typeof room === 'object') {
    for (const [slot, id] of Object.entries(room as Record<string, unknown>)) {
      if ((SLOTS as readonly string[]).includes(slot) && isItem(id) && ITEMS[id].slot === slot) out[slot as Slot] = id;
    }
  }
  return out;
}

interface LinkLike { id: string; requesterId: string; addresseeId: string; acceptedAt: Date | null; createdAt: Date; room: unknown }

/** Wallet and furniture for an accepted couple. */
export async function homeOf(link: LinkLike, db: Prisma.TransactionClient = prisma) {
  const fromDay = keyOf(link.acceptedAt ?? link.createdAt);
  const [earnedRow, purchases] = await Promise.all([
    db.petDay.aggregate({
      where: { userId: { in: [link.requesterId, link.addresseeId] }, dayKey: { gte: fromDay } },
      _sum: { xp: true },
    }),
    db.couplePurchase.findMany({ where: { coupleId: link.id }, select: { itemId: true, price: true } }),
  ]);
  const earned = earnedRow._sum.xp ?? 0;
  const spent = purchases.reduce((s, p) => s + p.price, 0);
  return {
    earned,
    spent,
    balance: Math.max(0, earned - spent),
    owned: purchases.map((p) => p.itemId),
    equipped: equippedOf(link.room),
  };
}
