import {
  View, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { Appear, Button, Corners, Label, RADIUS, STROKE, ScreenHeader, Segmented, Sticker } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { analyzeFoodImage, logMeal, lookupBarcode } from '@/services/api';
import { detectLiquidMl, addWaterMl } from '@/services/waterTracker';
import { getQuota } from '@/lib/plans';
import BarcodeScanner from '@/components/log/BarcodeScanner';
import ResultCard, { FoodResult } from '@/components/log/ResultCard';
import ImagePickerButtons from '@/components/log/ImagePickerButtons';

type LogMode = 'photo' | 'label' | 'barcode';

const MODES: LogMode[] = ['photo', 'label', 'barcode'];

export default function LogScreen() {
  const { t, language } = useTranslation();
  const c = useTheme();
  const router = useRouter();
  const { refreshToday, user } = useStore();
  const plan = user?.plan ?? 'FREE';
  const aiQuota = getQuota(plan, 'dailyAiCalls');
  // Free accounts get unlimited scans for their first 7 days (enforced on the server too).
  const trialDaysLeft = aiQuota === -1 || !user?.createdAt ? 0
    : Math.ceil((new Date(user.createdAt).getTime() + 7 * 864e5 - Date.now()) / 864e5);
  const bonusScans = user?.bonusAiCalls ?? 0;
  const quotaBadge = trialDaysLeft > 0
    ? (t('log.trialBadge' as any) as string).replace('{days}', String(trialDaysLeft))
    : (t('log.freeQuotaBadge' as any) as string).replace('{quota}', String(aiQuota))
      + (bonusScans > 0 ? (t('log.bonusBadge' as any) as string).replace('{n}', String(bonusScans)) : '');

  const [mode, setMode] = useState<LogMode>('photo');
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<FoodResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({ food: '', calories: '', protein: '', carbs: '', fat: '' });

  // Photo taken from the yellow camera button in the tab bar arrives as a param.
  const { imageUri } = useLocalSearchParams<{ imageUri?: string }>();
  useEffect(() => {
    if (!imageUri) return;
    setMode('photo');
    setImage(imageUri);
    setResult(null);
    setIsEditing(false);
    router.setParams({ imageUri: undefined } as any);
  }, [imageUri]);

  const pickImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) { Alert.alert(t('common.error'), t('log.needPermission')); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!r.canceled && r.assets[0]) { setImage(r.assets[0].uri); setResult(null); }
  };

  const takePhoto = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) { Alert.alert(t('common.error'), t('log.needPermission')); return; }
    const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!r.canceled && r.assets[0]) { setImage(r.assets[0].uri); setResult(null); }
  };

  const clearImage = () => { setImage(null); setResult(null); setIsEditing(false); };

  const setResultWithEdit = (r: FoodResult) => {
    setResult(r);
    setEditedData({ food: r.food, calories: String(r.calories), protein: String(r.protein), carbs: String(r.carbs), fat: String(r.fat) });
    setIsEditing(false);
  };

  const analyzeImage = async (analysisMode: 'food' | 'label') => {
    if (!image) return;
    setAnalyzing(true);
    try {
      const analysis = await analyzeFoodImage(image, language, analysisMode);
      setResultWithEdit(analysis);
    } catch (error: any) {
      if (error?.code === 'AI_LIMIT_REACHED' || error?.message?.includes('AI_LIMIT_REACHED')) {
        Alert.alert(
          t('log.aiLimitTitle' as any),
          (t('log.aiLimitMsg' as any) as string).replace('{quota}', String(aiQuota)),
          [
            // Barcode lookups are never limited, so offer that first.
            { text: t('log.scanBarcodeInstead' as any), onPress: () => handleModeChange('barcode') },
            { text: t('log.upgradeBtn' as any), onPress: () => router.push('/(tabs)/settings/pricing') },
            { text: t('log.laterBtn' as any), style: 'cancel' },
          ]
        );
      } else {
        Alert.alert(t('log.analysisFailed'), error.message || t('log.analysisFailed'));
      }
    } finally { setAnalyzing(false); }
  };

  const handleBarcodeScan = async (code: string) => {
    if (lookingUp) return;
    setLookingUp(true);
    try {
      const found = await lookupBarcode(code);
      if (found) { setResultWithEdit(found); }
      else {
        Alert.alert(t('log.productNotFound' as any), (t('log.productNotFoundMsg' as any) as string).replace('{code}', code), [
          { text: t('log.manualEntry' as any), onPress: () => { setResult({ food: code, calories: 0, protein: 0, carbs: 0, fat: 0, confidence: 1 }); setEditedData({ food: code, calories: '0', protein: '0', carbs: '0', fat: '0' }); setIsEditing(true); } },
          { text: t('log.rescan' as any), style: 'cancel' },
        ]);
      }
    } catch { Alert.alert(t('log.lookupFailed' as any), t('log.lookupFailedMsg' as any)); }
    finally { setLookingUp(false); }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (result) setEditedData({ food: result.food, calories: String(result.calories), protein: String(result.protein), carbs: String(result.carbs), fat: String(result.fat) });
  };

  const handleSaveEdit = () => {
    if (!result) return;
    setResult({ ...result, food: editedData.food || result.food, calories: parseFloat(editedData.calories) || result.calories, protein: parseFloat(editedData.protein) || result.protein, carbs: parseFloat(editedData.carbs) || result.carbs, fat: parseFloat(editedData.fat) || result.fat });
    setIsEditing(false);
  };

  const saveMeal = async () => {
    if (!result) return;
    if (isEditing) { handleSaveEdit(); return; }
    setSaving(true);
    try {
      await logMeal({ food_name: result.food, calories: result.calories, protein: result.protein, carbs: result.carbs, fat: result.fat, image_url: image || '' });
      const liquidMl = detectLiquidMl(result.food);
      if (liquidMl > 0) {
        await addWaterMl(liquidMl);
        Alert.alert(t('settings.success'), `${t('log.saveSuccess')}\n${(t('water.autoAdded' as any) as string).replace('{ml}', String(liquidMl))}`);
      } else {
        Alert.alert(t('settings.success'), t('log.saveSuccess'));
      }
      clearImage(); setResult(null); refreshToday();
    } catch (error: any) { Alert.alert(t('log.saveFailed'), error.message || t('log.saveFailed')); }
    finally { setSaving(false); }
  };

  const handleModeChange = (newMode: LogMode) => { setMode(newMode); clearImage(); setResult(null); setLookingUp(false); };

  const modeCaption = mode === 'barcode' ? t('log.barcodeScanDesc' as any) : mode === 'label' ? t('log.labelScanDesc' as any) : t('log.takeOrSelect');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.backgroundPrimary }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24, flexGrow: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <ScreenHeader title={t('tabs.log')} />
        <Text style={{ fontSize: 14, lineHeight: 20, color: c.textSecondary, marginTop: -8, marginBottom: 14 }}>{modeCaption}</Text>

        <Segmented
          value={mode}
          onChange={handleModeChange}
          options={MODES.map((key) => ({ key, label: t(`log.${key}Short` as any) }))}
          style={{ marginBottom: 14 }}
        />

        {/* Barcode mode */}
        {mode === 'barcode' && (
          <>
            {lookingUp ? (
              <View style={{ height: 300, borderRadius: RADIUS.card, borderWidth: STROKE.card, borderColor: c.borderPrimary, backgroundColor: c.cardBackground, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={c.textPrimary} />
                <Label style={{ marginTop: 14 }}>{t('log.lookingUp' as any)}</Label>
              </View>
            ) : result ? null : (
              <BarcodeScanner onScanned={handleBarcodeScan} />
            )}
            {result && <Appear><ResultCard result={result} isEditing={isEditing} editedData={editedData} saving={saving} onEdit={() => setIsEditing(true)} onCancelEdit={handleCancelEdit} onSaveEdit={handleSaveEdit} onChange={(k, v) => setEditedData(d => ({ ...d, [k]: v }))} onSaveMeal={saveMeal} /></Appear>}
            {result && !isEditing && (
              <Button label={t('log.rescan' as any)} icon="barcode-outline" variant="outline" onPress={() => { setResult(null); setLookingUp(false); }} />
            )}
          </>
        )}

        {/* Photo / Label modes */}
        {mode !== 'barcode' && (
          <>
            {image && (
              <View style={{ marginBottom: 14 }}>
                <View style={{ borderRadius: RADIUS.card, overflow: 'hidden', borderWidth: STROKE.card, borderColor: c.borderPrimary }}>
                  <Image source={{ uri: image }} style={{ width: '100%', aspectRatio: 4 / 3 }} resizeMode="cover" accessibilityIgnoresInvertColors />
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
                {!result && (
                  <>
                    {aiQuota !== -1 && (
                      <TouchableOpacity
                        onPress={() => router.push('/(tabs)/settings/pricing')}
                        accessibilityRole="button"
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'center', minHeight: 44, paddingHorizontal: 12, marginTop: 6 }}
                      >
                        <Ionicons name="flash" size={13} color={c.textSecondary} />
                        <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary }}>{quotaBadge}</Text>
                      </TouchableOpacity>
                    )}
                    <Button
                      label={mode === 'label' ? t('log.extractNutrition' as any) : t('log.analyzeFood')}
                      icon={mode === 'label' ? 'scan' : 'sparkles'}
                      loading={analyzing}
                      onPress={() => analyzeImage(mode === 'label' ? 'label' : 'food')}
                      style={{ marginTop: aiQuota !== -1 ? 0 : 14 }}
                    />
                  </>
                )}
              </View>
            )}
            {result && <Appear><ResultCard result={result} isEditing={isEditing} editedData={editedData} saving={saving} onEdit={() => setIsEditing(true)} onCancelEdit={handleCancelEdit} onSaveEdit={handleSaveEdit} onChange={(k, v) => setEditedData(d => ({ ...d, [k]: v }))} onSaveMeal={saveMeal} /></Appear>}
            {!image && <ImagePickerButtons mode={mode as 'photo' | 'label'} onTakePhoto={takePhoto} onPickImage={pickImage} />}
            {image && !isEditing && !analyzing && (
              <Button label={t('log.selectOtherPhoto')} icon="images-outline" variant="outline" onPress={clearImage} />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
