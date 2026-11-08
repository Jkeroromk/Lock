import { View, ScrollView, Image, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useRefreshRewards } from '@/hooks/useRefreshRewards';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { Appear, Button, Card, Corners, Label, RADIUS, STROKE, ScreenHeader, Sticker } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { analyzeFoodImage, logMeal } from '@/services/api';
import { detectLiquidMl, addWater } from '@/services/waterTracker';
import { calorieLevel, isWarning, todaysCalories } from '@/lib/calorieStatus';
import { makeMealThumbnail } from '@/lib/image';
import { showToast } from '@/components/ui/Toast';
import { getQuota, proTrialDaysLeft } from '@/lib/plans';
import ResultCard, { FoodResult } from '@/components/log/ResultCard';
import { CartBar, CartSheet } from '@/components/log/MealCart';
import { useMealCartStore, type CartItem } from '@/store/useMealCartStore';
import { useMealLogging } from '@/hooks/useMealLogging';
import TabFocusFade from '@/components/ui/TabFocusFade';
import { useTabBarInset } from '@/hooks/useTabBarInset';
import { useDeviceLayout } from '@/hooks/useDeviceLayout';
import TwoPane from '@/components/layout/TwoPane';
import { calorieGoalNow } from '@/hooks/useDailyGoals';
import { useShallow } from 'zustand/react/shallow';
import QuickSearch, { type QuickSource } from '@/components/log/QuickSearch';
import LogWhenPicker, { whenLabel } from '@/components/log/LogWhenPicker';
import { MAX_BACKDATE_DAYS, daysAgo, eatenAtFor, exifTakenAt, isOtherDay, useLogWhenStore } from '@/store/useLogWhenStore';

/**
 * The 记录 tab. One layer, no mode switch (photo, label and barcode all live
 * on the camera page now):
 * - a photo from the camera → analysed here → result card;
 * - a barcode the camera couldn't find → typed in here;
 * - otherwise: search — recent foods, the food library, "describe it" (AI).
 * Every result can be saved now or to an earlier day / meal (补记).
 */
export default function LogScreen() {
  const tabInset = useTabBarInset();
  const { twoPane, kind } = useDeviceLayout();
  const { t, language } = useTranslation();
  const c = useTheme();
  const router = useRouter();
  const { refreshToday, user } = useStore(useShallow((st) => ({ refreshToday: st.refreshToday, user: st.user })));
  useRefreshRewards();
  const plan = user?.plan ?? 'FREE';
  const aiQuota = user?.isAdmin ? -1 : getQuota(plan, 'dailyAiCalls');
  // Every new account is Pro for its first 7 days (enforced on the server): unlimited scans.
  const trialDaysLeft = plan === 'FREE' ? proTrialDaysLeft(user?.createdAt) : 0;
  const bonusScans = user?.bonusAiCalls ?? 0;
  const quotaBadge = trialDaysLeft > 0
    ? (t('log.trialBadge' as any) as string).replace('{days}', String(trialDaysLeft))
    : (t('log.freeQuotaBadge' as any) as string).replace('{quota}', String(aiQuota))
      + (bonusScans > 0 ? (t('log.bonusBadge' as any) as string).replace('{n}', String(bonusScans)) : '');

  const [image, setImage] = useState<string | null>(null);
  const [imageKind, setImageKind] = useState<'food' | 'label'>('food');
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<FoodResult | null>(null);
  // Where the result came from: the list shows its icon, and only photos keep a thumbnail.
  const [source, setSource] = useState<CartItem['source']>('search');
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({ food: '', calories: '', protein: '', carbs: '', fat: '' });
  const [listOpen, setListOpen] = useState(false);
  const [recentKey, setRecentKey] = useState(0);
  const listLogging = useMealLogging();
  // 补记: the day / meal the next save goes to.
  const { dayOffset, slot, at } = useLogWhenStore(useShallow((st) => ({ dayOffset: st.dayOffset, slot: st.slot, at: st.at })));
  const otherDay = isOtherDay(dayOffset);
  const backdated = !!at || !(dayOffset === 0 && slot === 'now');

  // From the camera: a photo (analysed straight away), a barcode it couldn't find,
  // or 「搜索」 (start a fresh search).
  // `day` (YYYY-MM-DD): 补记 from the calendar. `takenAt` (ISO): when a photo from the album was taken.
  const { imageUri, imageMode, manualCode, mode: modeParam, day: dayParam, takenAt } =
    useLocalSearchParams<{ imageUri?: string; imageMode?: string; manualCode?: string; mode?: string; day?: string; takenAt?: string }>();
  const [autoAnalyze, setAutoAnalyze] = useState(false);

  const clearAll = () => { setImage(null); setResult(null); setIsEditing(false); setAnalyzing(false); };

  useEffect(() => {
    if (modeParam !== 'search') return;
    clearAll();
    router.setParams({ mode: undefined } as any);
  }, [modeParam]);
  useEffect(() => {
    if (!manualCode) return;
    setImage(null);
    setSource('barcode');
    setResult({ food: manualCode, calories: 0, protein: 0, carbs: 0, fat: 0, confidence: 1 });
    setEditedData({ food: manualCode, calories: '0', protein: '0', carbs: '0', fat: '0' });
    setIsEditing(true);
    router.setParams({ manualCode: undefined } as any);
  }, [manualCode]);
  useEffect(() => {
    if (!imageUri) return;
    const k = imageMode === 'label' ? 'label' : 'food';
    setImageKind(k);
    setSource(k === 'label' ? 'label' : 'photo');
    setImage(imageUri);
    setResult(null);
    setIsEditing(false);
    setAutoAnalyze(true);
    applyPhotoTime(takenAt);
    router.setParams({ imageUri: undefined, imageMode: undefined, takenAt: undefined } as any);
  }, [imageUri]);

  // 补记 from the calendar: that day is preset, then a photo from the album or a search.
  useEffect(() => {
    if (!dayParam || !/^\d{4}-\d{2}-\d{2}$/.test(dayParam)) return;
    const [y, m, d] = dayParam.split('-').map(Number);
    const off = daysAgo(new Date(y, m - 1, d, 12));
    clearAll();
    const when = useLogWhenStore.getState();
    when.reset();
    if (off > 0 && off < MAX_BACKDATE_DAYS) when.setDay(off);
    router.setParams({ day: undefined } as any);
  }, [dayParam]);

  /** A photo's own time decides when it was eaten (taken in the last few minutes = now). */
  function applyPhotoTime(iso?: string | null) {
    if (!iso) return;
    const t0 = new Date(iso).getTime();
    if (Number.isNaN(t0) || Date.now() - t0 < 30 * 60_000) return;
    useLogWhenStore.getState().setAt(iso);
  }

  /** 补记 with a photo from the album: analysed straight away, dated by the photo. */
  const pickFromLibrary = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      exif: true,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
    });
    const asset = !r.canceled ? r.assets[0] : null;
    if (!asset) return;
    setImageKind('food');
    setSource('photo');
    setImage(asset.uri);
    setResult(null);
    setIsEditing(false);
    setAutoAnalyze(true);
    applyPhotoTime(exifTakenAt(asset.exif as any));
  };

  const openCamera = (mode?: 'scan') => router.push(mode ? ({ pathname: '/camera', params: { mode } } as any) : '/camera');

  const setResultWithEdit = (r: FoodResult) => {
    setResult(r);
    setEditedData({ food: r.food, calories: String(r.calories), protein: String(r.protein), carbs: String(r.carbs), fat: String(r.fat) });
    setIsEditing(false);
  };

  const showAiLimit = () => {
    Alert.alert(
      t('log.aiLimitTitle' as any),
      (t('log.aiLimitMsg' as any) as string).replace('{quota}', String(aiQuota)),
      [
        // Barcode lookups and the food library are never limited, so offer the scanner first.
        { text: t('log.scanBarcodeInstead' as any), onPress: () => openCamera('scan') },
        { text: t('log.upgradeBtn' as any), onPress: () => router.push('/(tabs)/settings/pricing') },
        { text: t('log.laterBtn' as any), style: 'cancel' },
      ]
    );
  };

  const analyzeImage = async () => {
    if (!image) return;
    setAnalyzing(true);
    try {
      setResultWithEdit(await analyzeFoodImage(image, language, imageKind));
    } catch (error: any) {
      if (error?.code === 'AI_LIMIT_REACHED' || error?.message?.includes('AI_LIMIT_REACHED')) showAiLimit();
      else Alert.alert(t('log.analysisFailed'), error.message || t('log.analysisFailed'));
    } finally { setAnalyzing(false); }
  };

  useEffect(() => {
    if (!autoAnalyze || !image || analyzing || result) return;
    setAutoAnalyze(false);
    analyzeImage();
  }, [autoAnalyze, image]);

  /** A food from search (recent, library, AI sentence or manual) → the result card. */
  const handleQuickPick = (r: FoodResult, opts: { source: QuickSource; edit?: boolean }) => {
    setImage(null);
    setSource(opts.source);
    setResultWithEdit(r);
    if (opts.edit) setIsEditing(true);
  };

  const handleQuickAiError = (error: Error) => {
    if (error.message.includes('AI_LIMIT_REACHED')) showAiLimit();
    else if (error.message.includes('NOT_FOOD')) Alert.alert(t('quickLog.notFoodTitle'), t('quickLog.notFoodMsg'));
    else Alert.alert(t('log.analysisFailed'), t('quickLog.aiFailed'));
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (result) setEditedData({ food: result.food, calories: String(result.calories), protein: String(result.protein), carbs: String(result.carbs), fat: String(result.fat) });
  };

  const handleSaveEdit = () => {
    if (!result) return;
    const num = (v: string, fallback: number) => {
      const n = parseFloat(v.replace(',', '.'));
      return Number.isFinite(n) && n >= 0 ? n : fallback;
    };
    setResult({
      ...result,
      food: editedData.food.trim() || result.food,
      calories: num(editedData.calories, result.calories),
      protein: num(editedData.protein, result.protein),
      carbs: num(editedData.carbs, result.carbs),
      fat: num(editedData.fat, result.fat),
    });
    setIsEditing(false);
  };

  /** Drinks: ask before counting them as water, rather than adding it and offering an undo. */
  const askCountAsWater = (food: string, ml: number) => new Promise<boolean>((resolve) => {
    const fill = (key: string) => (t(key as any) as string).replace('{ml}', String(ml)).replace('{food}', food);
    Alert.alert(fill('log.waterAskTitle'), fill('log.waterAskMsg'), [
      { text: fill('log.waterAskNo'), style: 'cancel', onPress: () => resolve(false) },
      { text: fill('log.waterAskYes'), style: 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });

  const saveMeal = async () => {
    if (!result) return;
    if (isEditing) { handleSaveEdit(); return; }
    const detectedMl = detectLiquidMl(result.food);
    // Water is only tracked for today: drinks saved to an earlier day aren't offered.
    const liquidMl = !otherDay && detectedMl > 0 && (await askCountAsWater(result.food, detectedMl)) ? detectedMl : 0;
    const eatenAt = eatenAtFor(dayOffset, slot, at);
    const savedTo = backdated ? whenLabel(dayOffset, slot, t, language, at) : '';
    setSaving(true);
    const before = todaysCalories();
    try {
      const thumb = image ? await makeMealThumbnail(image) : null;
      await logMeal({
        food_name: result.food, calories: result.calories, protein: result.protein, carbs: result.carbs, fat: result.fat,
        // Barcode products have no photo of ours; use the product's own picture.
        image_url: thumb?.uri || result.imageUrl || '',
        thumbnail: thumb?.base64, // stored server-side so the photo shows on every device
        eaten_at: eatenAt,
      });
      const saved = result;
      if (liquidMl > 0) await addWater(liquidMl);

      clearAll(); refreshToday();
      useLogWhenStore.getState().reset();
      setRecentKey((k) => k + 1);
      if (otherDay) {
        // Not today: Today's ring doesn't change, so stay here and say where it went.
        showToast({
          message: `${t('log.savedToast' as any)} · ${saved.food}`,
          detail: `${t('quickLog.savedTo', { when: savedTo })} · ${Math.round(saved.calories)} kcal`,
        });
        return;
      }
      // Back to Today so the ring fills up; a toast instead of an OK-only alert.
      router.navigate('/(tabs)/today');
      const { calorieWarnings, user: me } = useStore.getState();
      const goal = calorieGoalNow();
      const after = before + Math.round(saved.calories);
      const overGoal = calorieWarnings && isWarning(calorieLevel(after, goal, me?.goal));
      const water = liquidMl > 0 ? (t('water.autoAdded' as any) as string).replace('{ml}', String(liquidMl)) : '';
      showToast({
        message: `${t('log.savedToast' as any)} · ${saved.food}`,
        detail: overGoal
          ? [t('calorieWarn.toastOver' as any, { kcal: (after - goal).toLocaleString() }), water].filter(Boolean).join(' · ')
          : [savedTo ? t('quickLog.savedTo', { when: savedTo }) : '', water || `${Math.round(saved.calories)} kcal`].filter(Boolean).join(' · '),
        icon: overGoal ? 'warning' : undefined,
      });
    } catch (error: any) { Alert.alert(t('log.saveFailed'), error.message || t('log.saveFailed')); }
    finally { setSaving(false); }
  };

  /** Put the current result on the list and get ready for the next one. */
  const addToList = async () => {
    if (!result) return;
    const r = result;
    const thumb = source === 'photo' && image ? await makeMealThumbnail(image) : null;
    useMealCartStore.getState().add({
      food: r.food, calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat,
      source, thumbUri: thumb?.uri ?? r.imageUrl, thumbBase64: thumb?.base64,
    });
    const n = useMealCartStore.getState().items.length;
    clearAll();
    showToast({
      message: t('log.addedToList', { food: r.food }),
      detail: t('log.listCount', { n: String(n) }),
      action: { label: t('log.viewList'), onPress: () => setListOpen(true) },
    });
  };

  const logAll = async () => {
    const when = backdated
      ? { eatenAt: eatenAtFor(dayOffset, slot, at), label: whenLabel(dayOffset, slot, t, language, at), otherDay }
      : undefined;
    if (await listLogging.logAll(when)) {
      setListOpen(false);
      useLogWhenStore.getState().reset();
      setRecentKey((k) => k + 1);
      if (!otherDay) router.navigate('/(tabs)/today');
    }
  };

  const header = (
    <>
      <ScreenHeader title={t('tabs.log')} />
      {!image && !result && !backdated ? (
        <Text style={{ fontSize: 14, lineHeight: 20, color: c.textSecondary, marginTop: -8, marginBottom: 14 }}>{t('quickLog.caption')}</Text>
      ) : null}
      {/* 补记: which day and meal, and the photo you took then. */}
      {!image && !result && backdated ? (
        <Card padding={14} style={{ marginBottom: 14, gap: 12 }}>
          <Label>{t('quickLog.backfillTitle')}</Label>
          <LogWhenPicker />
          <Button label={t('quickLog.fromAlbum')} icon="images-outline" onPress={pickFromLibrary} />
          <Text style={{ fontSize: 12, lineHeight: 17, color: c.textSecondary }}>{t('quickLog.backfillHint')}</Text>
        </Card>
      ) : null}
      <CartBar onOpen={() => setListOpen(true)} />
    </>
  );

  const resultCard = result ? (
    <Appear><ResultCard result={result} isEditing={isEditing} editedData={editedData} saving={saving} onEdit={() => setIsEditing(true)} onCancelEdit={handleCancelEdit} onSaveEdit={handleSaveEdit} onChange={(k, v) => setEditedData(d => ({ ...d, [k]: v }))} onSaveMeal={saveMeal} onAddToList={addToList} when={<LogWhenPicker />} hidePreview={otherDay} /></Appear>
  ) : null;

  // On the big Duo screens a 4:3 photo across the whole width is taller than
  // the screen; give it a fixed height there.
  const photoStyle = kind === 'innerTall' ? { width: '100%' as const, height: 340 } : { width: '100%' as const, aspectRatio: 4 / 3 };
  const photo = image ? (
    <View style={{ borderRadius: RADIUS.card, overflow: 'hidden', borderWidth: STROKE.card, borderColor: c.borderPrimary, marginBottom: 14 }}>
      <Image source={{ uri: image }} style={photoStyle} resizeMode="cover" accessibilityIgnoresInvertColors />
      <Corners />
      {analyzing ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,10,0.55)', alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={c.accent} />
          <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.accent, marginTop: 12, textTransform: 'uppercase' }}>{t('log.analyzing')}</Text>
        </View>
      ) : result ? (
        <Sticker style={{ position: 'absolute', left: 16, bottom: 16 }}>{t('log.aiAnalyzed' as any)}</Sticker>
      ) : null}
    </View>
  ) : null;

  // A photo that hasn't been analysed (analysis failed or was cancelled): try again.
  const analyzeControls = image && !result && !analyzing ? (
    <>
      {aiQuota !== -1 && (
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/settings/pricing')}
          accessibilityRole="button"
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'center', minHeight: 44, paddingHorizontal: 12 }}
        >
          <Ionicons name="flash" size={13} color={c.textSecondary} />
          <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary }}>{quotaBadge}</Text>
        </TouchableOpacity>
      )}
      <Button
        label={imageKind === 'label' ? t('log.extractNutrition' as any) : t('log.analyzeFood')}
        icon={imageKind === 'label' ? 'scan' : 'sparkles'}
        onPress={analyzeImage}
        style={{ marginBottom: 14 }}
      />
    </>
  ) : null;

  // Done with this one: another photo (camera) or back to search.
  const afterButtons = (image || result) && !isEditing && !analyzing ? (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {image ? (
        <Button label={t('quickLog.retake')} icon="camera-outline" variant="outline" onPress={() => { clearAll(); openCamera(); }} style={{ flex: 1 }} />
      ) : null}
      <Button label={t('quickLog.searchAgain')} icon="search-outline" variant="outline" onPress={clearAll} style={{ flex: 1 }} />
    </View>
  ) : null;

  const quickSearch = (
    <QuickSearch
      onPick={handleQuickPick}
      onAiError={handleQuickAiError}
      quotaBadge={aiQuota !== -1 ? quotaBadge : null}
      onQuotaPress={() => router.push('/(tabs)/settings/pricing')}
      refreshKey={recentKey}
    />
  );
  // Kept mounted (just hidden) so "换一个" comes back to the same search.
  const hiddenWhenBusy = { display: image || result ? 'none' as const : 'flex' as const };

  const cartSheet = <CartSheet visible={listOpen} onClose={() => setListOpen(false)} onLogAll={logAll} logging={listLogging.logging} when={<LogWhenPicker />} />;

  // Open iPhone Duo (or a wide window): photo or search on the left page,
  // the result and its buttons on the right.
  if (twoPane) {
    return (
      <TabFocusFade>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.backgroundPrimary }} edges={['top', 'left', 'right']}>
        <TwoPane
          left={
            <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: tabInset }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
              {header}
              {photo}
              {image ? null : quickSearch}
            </ScrollView>
          }
          right={
            <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: tabInset }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
              {analyzeControls}
              {resultCard}
              {afterButtons}
            </ScrollView>
          }
        />
        {cartSheet}
      </SafeAreaView>
      </TabFocusFade>
    );
  }

  return (
    <TabFocusFade>
    <SafeAreaView style={{ flex: 1, backgroundColor: c.backgroundPrimary }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: tabInset, flexGrow: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        {header}
        {photo}
        {analyzeControls}
        {resultCard}
        {afterButtons}
        <View style={hiddenWhenBusy}>{quickSearch}</View>
      </ScrollView>
      {cartSheet}
    </SafeAreaView>
    </TabFocusFade>
  );
}
