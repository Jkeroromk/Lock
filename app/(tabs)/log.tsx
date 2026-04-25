import {
  View, Text, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { analyzeFoodImage, logMeal, lookupBarcode } from '@/services/api';
import { detectLiquidMl, addWaterMl } from '@/services/waterTracker';
import { getQuota } from '@/lib/plans';
import BarcodeScanner from '@/components/log/BarcodeScanner';
import ResultCard, { FoodResult } from '@/components/log/ResultCard';
import ImagePickerButtons from '@/components/log/ImagePickerButtons';

type LogMode = 'photo' | 'label' | 'barcode';

const MODE_CONFIG: { key: LogMode; icon: string }[] = [
  { key: 'photo', icon: 'camera' },
  { key: 'label', icon: 'reader' },
  { key: 'barcode', icon: 'barcode' },
];

export default function LogScreen() {
  const { t, language } = useTranslation();
  const colors = useTheme();
  const router = useRouter();
  const { refreshToday, user } = useStore();
  const plan = user?.plan ?? 'FREE';
  const aiQuota = getQuota(plan, 'dailyAiCalls');

  const [mode, setMode] = useState<LogMode>('photo');
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<FoodResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({ food: '', calories: '', protein: '', carbs: '', fat: '' });

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
            { text: t('log.laterBtn' as any), style: 'cancel' },
            { text: t('log.upgradeBtn' as any), onPress: () => router.push('/(tabs)/settings/pricing') },
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundPrimary }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingTop: DIMENSIONS.SPACING * 0.8, paddingBottom: 20, flexGrow: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={{ marginBottom: DIMENSIONS.SPACING }}>
          <Text style={{ fontSize: TYPOGRAPHY.titleL, fontWeight: '900', color: colors.textPrimary, letterSpacing: -2, lineHeight: TYPOGRAPHY.titleL * 1.05 }}>{t('tabs.log')}</Text>
          <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '500', color: colors.textSecondary, marginTop: 2 }}>
            {mode === 'barcode' ? t('log.barcodeScanDesc' as any) : mode === 'label' ? t('log.labelScanDesc' as any) : t('log.takeOrSelect')}
          </Text>
        </View>

        {/* Mode selector */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.cardBackground, borderRadius: 16, borderWidth: 1, borderColor: colors.borderPrimary, padding: 4, marginBottom: DIMENSIONS.SPACING * 1.2 }}>
          {MODE_CONFIG.map(({ key, icon }) => {
            const active = mode === key;
            const modeLabel = key === 'photo' ? t('log.modePhoto' as any) : key === 'label' ? t('log.modeLabel' as any) : t('log.modeBarcode' as any);
            return (
              <TouchableOpacity key={key} onPress={() => handleModeChange(key)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: DIMENSIONS.SPACING * 0.5, borderRadius: 12, backgroundColor: active ? colors.textPrimary : 'transparent', gap: 5 }}>
                <Ionicons name={icon as any} size={TYPOGRAPHY.bodyXS} color={active ? colors.backgroundPrimary : colors.textSecondary} />
                <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '800', color: active ? colors.backgroundPrimary : colors.textSecondary }}>{modeLabel}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Barcode mode */}
        {mode === 'barcode' && (
          <>
            {lookingUp ? (
              <View style={{ borderRadius: 24, padding: DIMENSIONS.SPACING * 2.5, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.borderPrimary, alignItems: 'center', marginBottom: DIMENSIONS.SPACING }}>
                <ActivityIndicator size="large" color={colors.textPrimary} />
                <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '600', color: colors.textSecondary, marginTop: DIMENSIONS.SPACING * 0.8 }}>{t('log.lookingUp' as any)}</Text>
              </View>
            ) : result ? null : (
              <BarcodeScanner onScanned={handleBarcodeScan} />
            )}
            {result && <ResultCard result={result} isEditing={isEditing} editedData={editedData} saving={saving} onEdit={() => setIsEditing(true)} onCancelEdit={handleCancelEdit} onSaveEdit={handleSaveEdit} onChange={(k, v) => setEditedData(d => ({ ...d, [k]: v }))} onSaveMeal={saveMeal} />}
            {result && !isEditing && (
              <TouchableOpacity onPress={() => { setResult(null); setLookingUp(false); }} activeOpacity={0.8} style={{ borderRadius: 16, paddingVertical: DIMENSIONS.SPACING, alignItems: 'center', marginTop: DIMENSIONS.SPACING * 0.6, backgroundColor: colors.cardBackground, borderWidth: 2, borderColor: colors.borderPrimary }}>
                <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '700', color: colors.textPrimary }}>{t('log.rescan' as any)}</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Photo / Label modes */}
        {mode !== 'barcode' && (
          <>
            {image && (
              <View style={{ marginBottom: DIMENSIONS.SPACING }}>
                <View style={{ borderRadius: 24, overflow: 'hidden', marginBottom: DIMENSIONS.SPACING, borderWidth: 1, borderColor: colors.borderPrimary, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 }}>
                  <Image source={{ uri: image }} style={{ width: '100%', height: DIMENSIONS.SCREEN_WIDTH * 0.75 }} resizeMode="cover" />
                </View>
                {!result && (
                  <>
                    {aiQuota !== -1 && (
                      <TouchableOpacity onPress={() => router.push('/(tabs)/settings/pricing')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: DIMENSIONS.SPACING * 0.8, paddingVertical: DIMENSIONS.SPACING * 0.4, paddingHorizontal: DIMENSIONS.SPACING, backgroundColor: '#F59E0B22', borderRadius: 10, alignSelf: 'center' }}>
                        <Ionicons name="flash" size={12} color="#F59E0B" />
                        <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '800', color: '#F59E0B' }}>{(t('log.freeQuotaBadge' as any) as string).replace('{quota}', String(aiQuota))}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => analyzeImage(mode === 'label' ? 'label' : 'food')} disabled={analyzing} activeOpacity={0.8} style={{ borderRadius: 24, paddingVertical: DIMENSIONS.SPACING, alignItems: 'center', justifyContent: 'center', minHeight: 56, backgroundColor: colors.textPrimary, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 }}>
                      {analyzing ? <ActivityIndicator color={colors.backgroundPrimary} size="large" /> : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: DIMENSIONS.SPACING * 0.6 }}>
                          <Ionicons name={mode === 'label' ? 'scan' : 'sparkles'} size={TYPOGRAPHY.iconM} color={colors.backgroundPrimary} />
                          <Text style={{ fontSize: TYPOGRAPHY.body, fontWeight: '900', color: colors.backgroundPrimary }}>{mode === 'label' ? t('log.extractNutrition' as any) : t('log.analyzeFood')}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
            {result && <ResultCard result={result} isEditing={isEditing} editedData={editedData} saving={saving} onEdit={() => setIsEditing(true)} onCancelEdit={handleCancelEdit} onSaveEdit={handleSaveEdit} onChange={(k, v) => setEditedData(d => ({ ...d, [k]: v }))} onSaveMeal={saveMeal} />}
            {!image && <ImagePickerButtons mode={mode as 'photo' | 'label'} onTakePhoto={takePhoto} onPickImage={pickImage} />}
            {image && !isEditing && (
              <TouchableOpacity onPress={clearImage} activeOpacity={0.8} style={{ borderRadius: 16, paddingVertical: DIMENSIONS.SPACING, alignItems: 'center', marginTop: DIMENSIONS.SPACING * 0.6, backgroundColor: colors.cardBackground, borderWidth: 2, borderColor: colors.borderPrimary }}>
                <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '700', color: colors.textPrimary }}>{t('log.selectOtherPhoto')}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
