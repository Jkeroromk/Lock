import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 待记录清单: scan or photograph several foods in a row, then log them all at
 * once instead of scan → save → scan → save. Kept on the device so closing
 * the app doesn't lose a half-built list.
 */
export interface CartItem {
  id: string;
  food: string;
  /** Per serving. */
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servings: number;
  source: 'photo' | 'label' | 'barcode';
  /** Small photo kept in the app's documents folder, plus its base64 for upload. */
  thumbUri?: string;
  thumbBase64?: string;
}

interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, 'id' | 'servings'> & { servings?: number }) => void;
  setServings: (id: string, servings: number) => void;
  remove: (id: string) => void;
  removeMany: (ids: string[]) => void;
  clear: () => void;
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const useMealCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) => set((s) => ({ items: [...s.items, { ...item, id: newId(), servings: item.servings ?? 1 }] })),
      setServings: (id, servings) =>
        set((s) => ({
          items: s.items.map((it) => (it.id === id ? { ...it, servings: Math.min(20, Math.max(0.5, Math.round(servings * 2) / 2)) } : it)),
        })),
      remove: (id) => set((s) => ({ items: s.items.filter((it) => it.id !== id) })),
      removeMany: (ids) => set((s) => ({ items: s.items.filter((it) => !ids.includes(it.id)) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'lock-meal-cart', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Totals for an item list, servings applied. */
export function cartTotals(items: CartItem[]) {
  return items.reduce(
    (t, it) => ({
      calories: t.calories + it.calories * it.servings,
      protein: t.protein + it.protein * it.servings,
      carbs: t.carbs + it.carbs * it.servings,
      fat: t.fat + it.fat * it.servings,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/** "Protein bar ×2" for the meal log. */
export function cartItemName(it: CartItem) {
  return it.servings === 1 ? it.food : `${it.food} ×${it.servings}`;
}
