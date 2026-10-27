import { useEffect, useRef, useState } from 'react';
import { View, Pressable, ActivityIndicator, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, FadeInDown, FadeOut, SlideInDown, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { Button, PressScale } from '@/components/ui/bxc';
import { CartSheet } from '@/components/log/MealCart';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { lookupBarcode, type FoodAnalysis } from '@/services/api';
import { useMealCartStore, cartTotals } from '@/store/useMealCartStore';
import { useMealLogging } from '@/hooks/useMealLogging';
import { useTheme } from '@/hooks/useTheme';

type Mode = 'photo' | 'label' | 'scan';

const INK = '#0A0A0A';
const PAPER = '#F2F1EC';
const YELLOW = '#FFD43B';
const LINE = '#3A3A37';
const MUTED = '#CFCDC4';
const SOFT = '#55544F';
const FINDER = '#1E1D1A';

/** Four yellow corner brackets around the target area. */
function Brackets({ w, h, size = 34 }: { w: number | string; h: number | string; size?: number }) {
  const common = { position: 'absolute' as const, width: size, height: size, borderColor: YELLOW };
  return (
    <View pointerEvents="none" style={{ width: w as any, height: h as any }}>
      <View style={[common, { left: 0, top: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 10 }]} />
      <View style={[common, { right: 0, top: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 10 }]} />
      <View style={[common, { left: 0, bottom: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 10 }]} />
      <View style={[common, { right: 0, bottom: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 10 }]} />
    </View>
  );
}

function RoundButton({ icon, label, onPress, active }: { icon: string; label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={{
        width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: active ? YELLOW : LINE,
        backgroundColor: active ? YELLOW : 'transparent', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Ionicons name={icon as any} size={19} color={active ? INK : PAPER} />
    </Pressable>
  );
}

/**
 * The yellow camera button opens this: our own camera with 拍照 · 扫码 modes.
 * Photo → the log tab analyses it as before. Scan → each product shows here;
 * "加入清单" keeps scanning, "直接记录" saves it at once.
 */
export default function CameraScreen() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);
  const c = useTheme();
  // Scan events arrive many times a second; state updates are too slow to gate them.
  const scanBusy = useRef(false);

  const [mode, setMode] = useState<Mode>(params.mode === 'scan' ? 'scan' : params.mode === 'label' ? 'label' : 'photo');
  const [torch, setTorch] = useState(false);
  const [taking, setTaking] = useState(false);
  // White flash the instant the shutter is pressed, so it feels immediate
  // even while the photo is still being captured and saved.
  const flash = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const [ready, setReady] = useState(false);

  const [lookingUp, setLookingUp] = useState(false);
  const [found, setFound] = useState<FoodAnalysis | null>(null);
  const [missing, setMissing] = useState<string | null>(null);
  const [servings, setServings] = useState(1);
  const [added, setAdded] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  // The same barcode stays in view after closing its card; ignore it for a moment.
  const lastCode = useRef<{ code: string; at: number } | null>(null);

  const items = useMealCartStore((s) => s.items);
  const totals = cartTotals(items);
  const { logging, logOne, logAll } = useMealLogging();

  useEffect(() => {
    if (!added) return;
    const id = setTimeout(() => setAdded(null), 1800);
    return () => clearTimeout(id);
  }, [added]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/today'));

  /** Leave the camera for a tab, passing params along. */
  const goTo = (pathname: '/(tabs)/log' | '/(tabs)/today', p?: Record<string, string>) => {
    if (router.canGoBack()) router.back();
    setTimeout(() => router.navigate(p ? ({ pathname, params: p } as any) : pathname), 0);
  };

  const sendPhoto = (uri: string) => goTo('/(tabs)/log', { imageUri: uri, imageMode: mode === 'label' ? 'label' : 'food' });

  const takePhoto = async () => {
    if (!camRef.current || taking) return;
    setTaking(true);
    flash.value = withSequence(withTiming(0.85, { duration: 60 }), withTiming(0, { duration: 260 }));
    try {
      // Analysis shrinks photos to 1024 px anyway; lower quality saves encode time.
      const pic = await camRef.current.takePictureAsync({ quality: 0.6, skipProcessing: true });
      if (pic?.uri) sendPhoto(pic.uri);
    } catch {
      Alert.alert(t('log.analysisFailed'), t('camera.photoFailed'));
    } finally {
      setTaking(false);
    }
  };

  const pickFromLibrary = async () => {
    // The system photo picker needs no library permission; asking first only added a delay.
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!r.canceled && r.assets[0]) sendPhoto(r.assets[0].uri);
  };

  const onBarcode = async ({ data }: { data: string }) => {
    if (!data || scanBusy.current) return;
    const now = Date.now();
    if (lastCode.current && lastCode.current.code === data && now - lastCode.current.at < 3000) return;
    lastCode.current = { code: data, at: now };
    scanBusy.current = true;
    setLookingUp(true);
    try {
      const product = await lookupBarcode(data, language);
      if (product) { setFound(product); setServings(1); }
      else setMissing(data);
    } catch {
      setMissing(data);
    } finally {
      setLookingUp(false);
    }
  };

  const resumeScanning = () => {
    if (found || missing) lastCode.current = { code: lastCode.current?.code ?? '', at: Date.now() };
    setFound(null);
    setMissing(null);
    scanBusy.current = false;
  };

  const addToList = () => {
    if (!found) return;
    useMealCartStore.getState().add({
      food: found.food, calories: found.calories, protein: found.protein, carbs: found.carbs, fat: found.fat,
      servings, source: 'barcode', thumbUri: found.imageUrl,
    });
    setAdded(found.food);
    resumeScanning();
  };

  const logNow = async () => {
    if (!found) return;
    const ok = await logOne({ ...found, servings, imageUri: found.imageUrl });
    if (ok) goTo('/(tabs)/today');
  };

  const onLogAll = async () => {
    if (await logAll()) {
      setListOpen(false);
      goTo('/(tabs)/today');
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setTorch(false);
    resumeScanning();
  };

  const scanning = mode === 'scan' && !found && !missing && !lookingUp;
  const sheetOpen = mode === 'scan' && (!!found || !!missing);

  // ── Permission ──
  if (!permission?.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: INK, paddingTop: insets.top + 10, paddingHorizontal: 18 }}>
        <RoundButton icon="close" label={t('common.close')} onPress={close} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 12 }}>
          {!permission ? (
            <ActivityIndicator color={YELLOW} />
          ) : (
            <>
              <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: YELLOW, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] }}>
                <Ionicons name="camera-outline" size={30} color={INK} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: PAPER, textAlign: 'center' }}>{t('log.cameraPermissionTitle' as any)}</Text>
              <Text style={{ fontSize: 14, lineHeight: 20, color: MUTED, textAlign: 'center' }}>{t('log.cameraPermissionDesc' as any)}</Text>
              <Button label={t('log.grantCamera' as any)} onPress={requestPermission} style={{ alignSelf: 'stretch', marginTop: 6 }} />
              <Button label={t('camera.fromLibrary')} variant="outline" onPress={pickFromLibrary} style={{ alignSelf: 'stretch', borderColor: LINE }} />
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: INK }}>
      {/* Top bar */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <RoundButton icon="close" label={t('common.close')} onPress={close} />
        {items.length > 0 ? (
          <PressScale
            onPress={() => setListOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('log.viewList')}
            style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: YELLOW, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Ionicons name="list" size={16} color={INK} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: INK }}>
              {t('camera.listChip', { n: String(items.length), kcal: Math.round(totals.calories).toLocaleString() })}
            </Text>
          </PressScale>
        ) : (
          <Text style={{ fontFamily: FONTS.mono, fontSize: 12, letterSpacing: 1, color: '#8C8B86' }}>{t('camera.title')}</Text>
        )}
        <RoundButton icon={torch ? 'flash' : 'flash-outline'} label={t('camera.torch')} onPress={() => setTorch((v) => !v)} active={torch} />
      </View>

      {/* Viewfinder */}
      <View style={{ flex: 1, marginHorizontal: 14, borderRadius: 28, overflow: 'hidden', backgroundColor: FINDER }}>
        <CameraView
          ref={camRef}
          style={{ flex: 1 }}
          facing="back"
          enableTorch={torch}
          onCameraReady={() => setReady(true)}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'] }}
          onBarcodeScanned={mode === 'scan' ? onBarcode : undefined}
        />
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          {mode !== 'scan' ? (
            <View style={{ position: 'absolute', left: 20, right: 20, top: 20, bottom: 20 }}>
              <Brackets w="100%" h="100%" />
            </View>
          ) : (
            <View style={{ alignItems: 'center', gap: 16, opacity: sheetOpen ? 0 : 1 }}>
              <View>
                <Brackets w={270} h={130} size={30} />
                <View style={{ position: 'absolute', left: 18, right: 18, top: 63, height: 3, borderRadius: 2, backgroundColor: YELLOW, opacity: scanning ? 1 : 0.35 }} />
              </View>
              {lookingUp ? <ActivityIndicator color={YELLOW} /> : null}
            </View>
          )}
          <Text style={{ position: 'absolute', left: 0, right: 0, bottom: 26, textAlign: 'center', fontSize: 14, color: MUTED }}>
            {mode === 'photo' ? t('camera.photoHint') : mode === 'label' ? t('camera.labelHint') : lookingUp ? t('log.lookingUp' as any) : t('camera.scanHint')}
          </Text>
        </View>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#FFFFFF' }, flashStyle]} />
        {added ? (
          <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(200)} style={{ position: 'absolute', top: 14, left: 14, right: 14, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, backgroundColor: PAPER }}>
              <Ionicons name="checkmark-circle" size={18} color={INK} />
              <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: INK, maxWidth: 260 }}>{t('camera.added', { food: added })}</Text>
            </View>
          </Animated.View>
        ) : null}
      </View>

      {/* Modes */}
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 14, paddingBottom: 10 }}>
        {(['photo', 'label', 'scan'] as const).map((m) => {
          const on = m === mode;
          return (
            <Pressable
              key={m}
              onPress={() => switchMode(m)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={{ height: 36, paddingHorizontal: 18, borderRadius: 18, backgroundColor: on ? YELLOW : 'transparent', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 15, fontWeight: on ? '800' : '700', color: on ? INK : MUTED }}>
                {m === 'photo' ? t('camera.modePhoto') : m === 'label' ? t('camera.modeLabel') : t('camera.modeScan')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Controls */}
      <View style={{ height: 96, paddingHorizontal: 34, paddingBottom: insets.bottom, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={pickFromLibrary} accessibilityRole="button" accessibilityLabel={t('camera.fromLibrary')}
          style={{ width: 54, height: 54, borderRadius: 16, borderWidth: 2, borderColor: LINE, backgroundColor: FINDER, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="images-outline" size={22} color={PAPER} />
        </Pressable>
        {mode !== 'scan' ? (
          <Pressable onPress={takePhoto} disabled={!ready || taking} accessibilityRole="button" accessibilityLabel={t('camera.shutter')}
            style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: PAPER, alignItems: 'center', justifyContent: 'center', opacity: ready ? 1 : 0.5 }}>
            {taking ? <ActivityIndicator color={YELLOW} /> : <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: YELLOW }} />}
          </Pressable>
        ) : (
          <View style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="barcode-outline" size={34} color={'#8C8B86'} />
          </View>
        )}
        <Pressable onPress={() => setListOpen(true)} accessibilityRole="button" accessibilityLabel={t('log.viewList')}
          style={{ width: 54, height: 54, borderRadius: 16, borderWidth: 2, borderColor: LINE, backgroundColor: FINDER, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="list" size={22} color={PAPER} />
          {items.length > 0 ? (
            <View style={{ position: 'absolute', top: -8, right: -8, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5, backgroundColor: YELLOW, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 12, fontWeight: '700', color: INK }}>{items.length}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* Scan result */}
      {sheetOpen ? (
        <Animated.View
          entering={SlideInDown.duration(260).easing(Easing.out(Easing.cubic))}
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: 18, paddingBottom: insets.bottom + 18,
            borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: c.backgroundPrimary, gap: 14,
          }}
        >
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.borderSecondary }} />
          {found ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 64, height: 64, borderRadius: 14, borderWidth: 1.5, borderColor: c.borderSecondary, backgroundColor: '#FFFFFF', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                  {found.imageUrl ? (
                    <Image source={{ uri: found.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessibilityIgnoresInvertColors />
                  ) : (
                    <Ionicons name="barcode-outline" size={26} color="#0A0A0A" />
                  )}
                </View>
                <Text numberOfLines={3} style={{ flex: 1, fontSize: 17, fontWeight: '800', lineHeight: 21, color: c.textPrimary }}>{found.food}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 36, fontWeight: '800', letterSpacing: -1.4, lineHeight: 38, color: c.textPrimary }}>{Math.round(found.calories * servings)}</Text>
                  <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: c.textSecondary }}>KCAL</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([['protein', found.protein], ['carbs', found.carbs], ['fat', found.fat]] as const).map(([k, v]) => (
                  <View key={k} style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 12, backgroundColor: c.cardBackground, borderWidth: 1.5, borderColor: c.divider, gap: 2 }}>
                    <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: c.textSecondary }}>{t(`log.${k}`)}</Text>
                    <Text style={{ fontSize: 19, fontWeight: '800', color: c.textPrimary }}>{Math.round(v * servings * 10) / 10}g</Text>
                  </View>
                ))}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 13, color: c.textSecondary }}>{t('camera.servings')}</Text>
                <Pressable onPress={() => setServings((v) => Math.max(0.5, v <= 1 ? v - 0.5 : v - 1))} accessibilityRole="button" accessibilityLabel={t('log.lessServing')} hitSlop={6}
                  style={{ width: 36, height: 36, borderRadius: 10, borderWidth: 2, borderColor: c.borderPrimary, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="remove" size={18} color={c.textPrimary} />
                </Pressable>
                <Text style={{ fontFamily: FONTS.mono, fontSize: 15, fontWeight: '700', minWidth: 34, textAlign: 'center', color: c.textPrimary }}>×{servings}</Text>
                <Pressable onPress={() => setServings((v) => Math.min(20, v < 1 ? v + 0.5 : v + 1))} accessibilityRole="button" accessibilityLabel={t('log.moreServing')} hitSlop={6}
                  style={{ width: 36, height: 36, borderRadius: 10, borderWidth: 2, borderColor: c.borderPrimary, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="add" size={18} color={c.textPrimary} />
                </Pressable>
                <Pressable onPress={resumeScanning} hitSlop={8} accessibilityRole="button" style={{ marginLeft: 'auto' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: c.textSecondary }}>{t('camera.notThis')}</Text>
                </Pressable>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button label={t('log.addToList')} icon="add" onPress={addToList} disabled={logging} style={{ flex: 1 }} />
                <Button label={t('camera.logNow')} variant="outline" onPress={logNow} loading={logging} style={{ flex: 1 }} />
              </View>
            </>
          ) : (
            <>
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: c.textPrimary }}>{t('camera.notFound')}</Text>
                <Text style={{ fontSize: 14, lineHeight: 20, color: c.textSecondary }}>{t('camera.notFoundBody', { code: missing ?? '' })}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button label={t('camera.keepScanning')} onPress={resumeScanning} style={{ flex: 1 }} />
                <Button label={t('log.manualEntry' as any)} variant="outline" onPress={() => goTo('/(tabs)/log', { manualCode: missing ?? '' })} style={{ flex: 1 }} />
              </View>
            </>
          )}
        </Animated.View>
      ) : null}

      <CartSheet visible={listOpen} onClose={() => setListOpen(false)} onLogAll={onLogAll} logging={logging} />
    </View>
  );
}
