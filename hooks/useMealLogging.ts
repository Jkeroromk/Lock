import { useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from '@/i18n';
import { useStore } from '@/store/useStore';
import { useMealCartStore, cartItemName } from '@/store/useMealCartStore';
import { logMeal } from '@/services/api';
import { detectLiquidMl, addWater } from '@/services/waterTracker';
import { calorieLevel, isWarning, todaysCalories } from '@/lib/calorieStatus';
import { calorieGoalNow } from '@/hooks/useDailyGoals';
import { showToast } from '@/components/ui/Toast';

export interface LoggableFood {
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servings?: number;
  /** https product photo, or a local file:// thumbnail. */
  imageUri?: string;
  /** Base64 thumbnail to store server-side (photos only). */
  thumbBase64?: string;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Saving meals from anywhere (log tab, camera): one food, or everything on
 * the 待记录 list. Asks once whether drinks count as water, refreshes Today
 * and shows the "saved" toast (with the over-goal warning when it applies).
 */
export function useMealLogging() {
  const { t } = useTranslation();
  const refreshToday = useStore((s) => s.refreshToday);
  const [logging, setLogging] = useState(false);

  /** Drinks: ask before counting them as water. */
  const askCountAsWater = (food: string, ml: number) => new Promise<boolean>((resolve) => {
    const fill = (key: string) => (t(key as any) as string).replace('{ml}', String(ml)).replace('{food}', food);
    Alert.alert(fill('log.waterAskTitle'), fill('log.waterAskMsg'), [
      { text: fill('log.waterAskNo'), style: 'cancel', onPress: () => resolve(false) },
      { text: fill('log.waterAskYes'), style: 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });

  const toastSaved = (message: string, kcal: number, before: number, waterMl: number) => {
    const { calorieWarnings, user: me } = useStore.getState();
    const goal = calorieGoalNow();
    const after = before + kcal;
    const overGoal = calorieWarnings && isWarning(calorieLevel(after, goal, me?.goal));
    const water = waterMl > 0 ? (t('water.autoAdded' as any) as string).replace('{ml}', String(waterMl)) : '';
    showToast({
      message,
      detail: overGoal
        ? [t('calorieWarn.toastOver' as any, { kcal: (after - goal).toLocaleString() }), water].filter(Boolean).join(' · ')
        : [`${kcal.toLocaleString()} kcal`, water].filter(Boolean).join(' · '),
      icon: overGoal ? 'warning' : undefined,
    });
  };

  const save = (f: LoggableFood) => {
    const n = f.servings ?? 1;
    return logMeal({
      food_name: n === 1 ? f.food : `${f.food} ×${n}`,
      calories: Math.round(f.calories * n),
      protein: r1(f.protein * n),
      carbs: r1(f.carbs * n),
      fat: r1(f.fat * n),
      image_url: f.imageUri || '',
      thumbnail: f.thumbBase64,
    });
  };

  /** Logs one food now. Returns true when saved. */
  const logOne = async (f: LoggableFood): Promise<boolean> => {
    if (logging) return false;
    const n = f.servings ?? 1;
    const detected = Math.round(detectLiquidMl(f.food) * n);
    const waterMl = detected > 0 && (await askCountAsWater(f.food, detected)) ? detected : 0;
    setLogging(true);
    const before = todaysCalories();
    try {
      await save(f);
      if (waterMl > 0) await addWater(waterMl).catch(() => {});
      refreshToday();
      toastSaved(`${t('log.savedToast' as any)} · ${f.food}`, Math.round(f.calories * n), before, waterMl);
      return true;
    } catch (error: any) {
      Alert.alert(t('log.saveFailed'), error?.message || t('log.saveFailed'));
      return false;
    } finally {
      setLogging(false);
    }
  };

  /** Logs every item on the list, each as its own meal; failures stay on the list. Returns true when all saved. */
  const logAll = async (): Promise<boolean> => {
    const items = useMealCartStore.getState().items;
    if (!items.length || logging) return false;
    const drinks = items
      .map((it) => ({ it, ml: Math.round(detectLiquidMl(it.food) * it.servings) }))
      .filter((d) => d.ml > 0);
    const drinkMl = drinks.reduce((sum, d) => sum + d.ml, 0);
    const countWater = drinkMl > 0 && (await askCountAsWater(drinks.map((d) => d.it.food).join(', '), drinkMl));
    setLogging(true);
    const before = todaysCalories();
    const done: string[] = [];
    let kcal = 0;
    for (const it of items) {
      try {
        await logMeal({
          food_name: cartItemName(it),
          calories: Math.round(it.calories * it.servings),
          protein: r1(it.protein * it.servings),
          carbs: r1(it.carbs * it.servings),
          fat: r1(it.fat * it.servings),
          image_url: it.thumbUri || '',
          thumbnail: it.thumbBase64,
        });
        done.push(it.id);
        kcal += Math.round(it.calories * it.servings);
      } catch {}
    }
    const loggedMl = countWater ? drinks.filter((d) => done.includes(d.it.id)).reduce((sum, d) => sum + d.ml, 0) : 0;
    if (loggedMl > 0) await addWater(loggedMl).catch(() => {});
    useMealCartStore.getState().removeMany(done);
    setLogging(false);
    if (done.length) refreshToday();

    const failed = items.length - done.length;
    if (failed > 0) {
      Alert.alert(t('log.saveFailed'), t('log.logAllPartial', { n: String(failed) }));
      return false;
    }
    toastSaved(t('log.loggedAll', { n: String(done.length) }), kcal, before, loggedMl);
    return true;
  };

  return { logging, logOne, logAll, askCountAsWater };
}
