import {
  View, Text, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, Alert, TextInput, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { analyzeFoodImage, logMeal, lookupBarcode } from '@/services/api';

type LogMode = 'photo' | 'label' | 'barcode';

const MODE_CONFIG: { key: LogMode; icon: string; label: string }[] = [
  { key: 'photo', icon: 'camera', label: '拍照识别' },
  { key: 'label', icon: 'reader', label: '营养标签' },
  { key: 'barcode', icon: 'barcode', label: '扫条码' },
];

const MACRO_COLORS = {
  protein: '#6366F1',
  carbs: '#F59E0B',
  fat: '#F97316',
};

// ── Barcode Scanner component ────────────────────────────────────────────────

function BarcodeScanner({ onScanned }: { onScanned: (code: string) => void }) {
  const colors = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  if (!permission) {
    return (
      <View style={{ height: DIMENSIONS.SCREEN_WIDTH * 0.7, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={{
        borderRadius: 24, padding: DIMENSIONS.SPACING * 2,
        backgroundColor: colors.cardBackground,
        borderWidth: 1, borderColor: colors.borderPrimary,
        alignItems: 'center',
      }}>
        <View style={{
          width: 60, height: 60, borderRadius: 18,
          backgroundColor: colors.cardBackgroundSecondary,
          alignItems: 'center', justifyContent: 'center',
          marginBottom: DIMENSIONS.SPACING,
        }}>
          <Ionicons name="camera-outline" size={TYPOGRAPHY.iconM} color={colors.textSecondary} />
        </View>
        <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary, marginBottom: 6 }}>
          需要相机权限
        </Text>
        <Text style={{ fontSize: TYPOGRAPHY.bodyS, color: colors.textSecondary, textAlign: 'center', marginBottom: DIMENSIONS.SPACING }}>
          请允许相机访问以扫描条形码
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={{
            paddingHorizontal: DIMENSIONS.SPACING * 1.5,
            paddingVertical: DIMENSIONS.SPACING * 0.7,
            borderRadius: 14, backgroundColor: colors.textPrimary,
          }}
        >
          <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '800', color: colors.backgroundPrimary }}>
            授权相机
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <View style={{
        borderRadius: 24, overflow: 'hidden',
        borderWidth: 1, borderColor: colors.borderPrimary,
        marginBottom: DIMENSIONS.SPACING,
      }}>
        <CameraView
          style={{ height: DIMENSIONS.SCREEN_WIDTH * 0.8 }}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr', 'code39'],
          }}
          onBarcodeScanned={({ data }) => {
            if (scannedRef.current) return;
            scannedRef.current = true;
            onScanned(data);
            // allow re-scan after 3s if needed
            setTimeout(() => { scannedRef.current = false; }, 3000);
          }}
        />
        {/* Viewfinder overlay */}
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <View style={{
            width: DIMENSIONS.SCREEN_WIDTH * 0.6,
            height: DIMENSIONS.SCREEN_WIDTH * 0.25,
            borderWidth: 2, borderColor: '#FFFFFF',
            borderRadius: 8,
          }} />
          <Text style={{
            marginTop: DIMENSIONS.SPACING * 0.8,
            fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700',
            color: '#FFFFFF',
            backgroundColor: 'rgba(0,0,0,0.45)',
            paddingHorizontal: 10, paddingVertical: 4,
            borderRadius: 8,
          }}>
            将条形码对准框内
          </Text>
        </View>
      </View>
      <Text style={{
        textAlign: 'center', fontSize: TYPOGRAPHY.bodyXS,
        color: colors.textSecondary, fontWeight: '600',
      }}>
        支持 EAN-13 / UPC / Code 128 / QR
      </Text>
    </View>
  );
}

// ── Analysis Result Card ─────────────────────────────────────────────────────

interface AnalysisResult {
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}

interface ResultCardProps {
  result: AnalysisResult;
  isEditing: boolean;
  editedData: { food: string; calories: string; protein: string; carbs: string; fat: string };
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onChange: (key: string, val: string) => void;
  onSaveMeal: () => void;
  saving: boolean;
}

function ResultCard({
  result, isEditing, editedData,
  onEdit, onCancelEdit, onSaveEdit, onChange, onSaveMeal, saving,
}: ResultCardProps) {
  const colors = useTheme();
  const { t } = useTranslation();

  return (
    <View style={{
      borderRadius: 24, marginBottom: DIMENSIONS.SPACING,
      backgroundColor: colors.cardBackground,
      borderWidth: 1, borderColor: colors.borderPrimary,
      overflow: 'hidden',
    }}>
      {/* Food name header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: DIMENSIONS.SPACING * 1.2,
        borderBottomWidth: 1, borderBottomColor: colors.borderPrimary,
      }}>
        <View style={{ flex: 1 }}>
          {isEditing ? (
            <TextInput
              value={editedData.food}
              onChangeText={(v) => onChange('food', v)}
              style={{
                fontSize: TYPOGRAPHY.title, fontWeight: '900', color: colors.textPrimary,
                backgroundColor: colors.cardBackgroundSecondary, borderRadius: 10,
                paddingHorizontal: DIMENSIONS.SPACING * 0.6, paddingVertical: DIMENSIONS.SPACING * 0.4,
                borderWidth: 1, borderColor: colors.borderPrimary,
              }}
              placeholderTextColor={colors.textSecondary}
            />
          ) : (
            <Text style={{
              fontSize: TYPOGRAPHY.title, fontWeight: '900', color: colors.textPrimary,
              lineHeight: TYPOGRAPHY.title * 1.2,
            }}>
              {result.food}
            </Text>
          )}
          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textSecondary, marginTop: 4 }}>
            {t('log.confidence')}：{(result.confidence * 100).toFixed(0)}%
          </Text>
        </View>
        {!isEditing && (
          <TouchableOpacity
            onPress={onEdit}
            style={{
              padding: DIMENSIONS.SPACING * 0.6, borderRadius: 10,
              backgroundColor: colors.cardBackgroundSecondary,
              borderWidth: 1, borderColor: colors.borderPrimary,
              marginLeft: DIMENSIONS.SPACING * 0.8,
            }}
          >
            <Ionicons name="create-outline" size={TYPOGRAPHY.iconXS} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Calories */}
      <View style={{
        paddingHorizontal: DIMENSIONS.SPACING * 1.4, paddingVertical: DIMENSIONS.SPACING * 1.2,
        borderBottomWidth: 1, borderBottomColor: colors.borderPrimary,
        flexDirection: 'row', alignItems: 'flex-end', gap: 8,
      }}>
        {isEditing ? (
          <TextInput
            value={editedData.calories}
            onChangeText={(v) => onChange('calories', v)}
            keyboardType="numeric"
            style={{
              fontSize: TYPOGRAPHY.numberL, fontWeight: '900', color: colors.textPrimary,
              backgroundColor: colors.cardBackgroundSecondary, borderRadius: 10,
              paddingHorizontal: DIMENSIONS.SPACING * 0.6, paddingVertical: DIMENSIONS.SPACING * 0.3,
              borderWidth: 1, borderColor: colors.borderPrimary, minWidth: 120,
            }}
            placeholderTextColor={colors.textSecondary}
          />
        ) : (
          <Text style={{
            fontSize: TYPOGRAPHY.numberL, fontWeight: '900', color: colors.textPrimary,
            lineHeight: TYPOGRAPHY.numberL * 1.05,
          }}>
            {result.calories}
          </Text>
        )}
        <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>
          {t('log.calories')}
        </Text>
      </View>

      {/* Macros */}
      <View style={{ flexDirection: 'row', padding: DIMENSIONS.SPACING * 1.2 }}>
        {([
          { label: t('log.protein'), key: 'protein', color: MACRO_COLORS.protein },
          { label: t('log.carbs'), key: 'carbs', color: MACRO_COLORS.carbs },
          { label: t('log.fat'), key: 'fat', color: MACRO_COLORS.fat },
        ] as const).map((macro, i) => (
          <View key={macro.key} style={{
            flex: 1, alignItems: 'center',
            borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: colors.borderPrimary,
          }}>
            <Text style={{
              fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary,
              marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              {macro.label}
            </Text>
            {isEditing ? (
              <TextInput
                value={editedData[macro.key]}
                onChangeText={(v) => onChange(macro.key, v)}
                keyboardType="numeric"
                style={{
                  fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: macro.color,
                  backgroundColor: colors.cardBackgroundSecondary, borderRadius: 8,
                  paddingHorizontal: DIMENSIONS.SPACING * 0.5, paddingVertical: DIMENSIONS.SPACING * 0.3,
                  borderWidth: 1, borderColor: colors.borderPrimary,
                  textAlign: 'center', minWidth: DIMENSIONS.SCREEN_WIDTH * 0.18,
                }}
                placeholderTextColor={colors.textSecondary}
              />
            ) : (
              <Text style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: macro.color }}>
                {(result as any)[macro.key]}g
              </Text>
            )}
          </View>
        ))}
      </View>

      {/* Action buttons */}
      <View style={{
        flexDirection: 'row', gap: DIMENSIONS.SPACING * 0.6,
        padding: DIMENSIONS.SPACING * 1.2,
        borderTopWidth: 1, borderTopColor: colors.borderPrimary,
      }}>
        {isEditing ? (
          <>
            <TouchableOpacity
              onPress={onCancelEdit}
              activeOpacity={0.8}
              style={{
                flex: 1, borderRadius: 16, paddingVertical: DIMENSIONS.SPACING * 0.9,
                alignItems: 'center', backgroundColor: colors.cardBackgroundSecondary,
                borderWidth: 1, borderColor: colors.borderPrimary,
              }}
            >
              <Text style={{ fontSize: TYPOGRAPHY.body, fontWeight: '800', color: colors.textPrimary }}>
                {t('log.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSaveEdit}
              activeOpacity={0.8}
              style={{
                flex: 2, borderRadius: 16, paddingVertical: DIMENSIONS.SPACING * 0.9,
                alignItems: 'center', backgroundColor: colors.textPrimary,
              }}
            >
              <Text style={{ fontSize: TYPOGRAPHY.body, fontWeight: '800', color: colors.backgroundPrimary }}>
                {t('log.saveChanges')}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={onSaveMeal}
            disabled={saving}
            activeOpacity={0.8}
            style={{
              flex: 1, borderRadius: 16, paddingVertical: DIMENSIONS.SPACING * 0.9,
              alignItems: 'center', backgroundColor: colors.textPrimary,
              opacity: saving ? 0.6 : 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {saving
                ? <ActivityIndicator color={colors.backgroundPrimary} size="small" />
                : <Ionicons name="checkmark-circle" size={TYPOGRAPHY.iconS} color={colors.backgroundPrimary} />
              }
              <Text style={{ fontSize: TYPOGRAPHY.body, fontWeight: '800', color: colors.backgroundPrimary }}>
                {saving ? '保存中...' : t('log.saveMeal')}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function LogScreen() {
  const { t, language } = useTranslation();
  const colors = useTheme();
  const { refreshToday } = useStore();

  const [mode, setMode] = useState<LogMode>('photo');
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({ food: '', calories: '', protein: '', carbs: '', fat: '' });

  // ── Image helpers ──
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

  // ── Analysis ──
  const analyzeImage = async (analysisMode: 'food' | 'label') => {
    if (!image) return;
    setAnalyzing(true);
    try {
      const analysis = await analyzeFoodImage(image, language, analysisMode);
      setResult(analysis);
      setEditedData({
        food: analysis.food,
        calories: String(analysis.calories),
        protein: String(analysis.protein),
        carbs: String(analysis.carbs),
        fat: String(analysis.fat),
      });
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert(t('log.analysisFailed'), error.message || t('log.analysisFailed'));
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Barcode lookup ──
  const handleBarcodeScan = async (code: string) => {
    if (lookingUp) return;
    setLookingUp(true);
    try {
      const found = await lookupBarcode(code);
      if (found) {
        setResult(found);
        setEditedData({
          food: found.food,
          calories: String(found.calories),
          protein: String(found.protein),
          carbs: String(found.carbs),
          fat: String(found.fat),
        });
        setIsEditing(false);
      } else {
        Alert.alert('未找到产品', `条码 ${code} 在数据库中未找到，您可以手动填写营养信息。`, [
          { text: '手动填写', onPress: () => openManualEntry(code) },
          { text: '重新扫描', style: 'cancel' },
        ]);
      }
    } catch {
      Alert.alert('查询失败', '请检查网络连接后重试');
    } finally {
      setLookingUp(false);
    }
  };

  const openManualEntry = (barcode: string) => {
    setResult({ food: barcode, calories: 0, protein: 0, carbs: 0, fat: 0, confidence: 1 });
    setEditedData({ food: barcode, calories: '0', protein: '0', carbs: '0', fat: '0' });
    setIsEditing(true);
  };

  // ── Edit handlers ──
  const handleEdit = () => setIsEditing(true);
  const handleCancelEdit = () => {
    setIsEditing(false);
    if (result) {
      setEditedData({
        food: result.food, calories: String(result.calories),
        protein: String(result.protein), carbs: String(result.carbs), fat: String(result.fat),
      });
    }
  };
  const handleSaveEdit = () => {
    if (!result) return;
    setResult({
      ...result,
      food: editedData.food || result.food,
      calories: parseFloat(editedData.calories) || result.calories,
      protein: parseFloat(editedData.protein) || result.protein,
      carbs: parseFloat(editedData.carbs) || result.carbs,
      fat: parseFloat(editedData.fat) || result.fat,
    });
    setIsEditing(false);
  };

  // ── Save meal ──
  const saveMeal = async () => {
    if (!result) return;
    if (isEditing) { handleSaveEdit(); return; }
    setSaving(true);
    try {
      await logMeal({
        food_name: result.food,
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        image_url: image || '',
      });
      Alert.alert(t('settings.success'), t('log.saveSuccess'));
      clearImage();
      setResult(null);
      refreshToday();
    } catch (error: any) {
      Alert.alert(t('log.saveFailed'), error.message || t('log.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  // ── Mode change ──
  const handleModeChange = (newMode: LogMode) => {
    setMode(newMode);
    clearImage();
    setResult(null);
    setLookingUp(false);
  };

  // ── Image picker buttons (shared for photo + label modes) ──
  const ImagePickerButtons = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {/* Icon */}
      <View style={{
        width: DIMENSIONS.SCREEN_WIDTH * 0.28, height: DIMENSIONS.SCREEN_WIDTH * 0.28,
        borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.14,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: DIMENSIONS.SPACING * 1.5,
        backgroundColor: colors.cardBackground,
        borderWidth: 2, borderColor: colors.borderPrimary,
      }}>
        <Ionicons
          name={mode === 'label' ? 'reader-outline' : 'camera-outline'}
          size={TYPOGRAPHY.iconXL}
          color={colors.textPrimary}
        />
      </View>

      <Text style={{
        fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: colors.textPrimary,
        marginBottom: DIMENSIONS.SPACING * 0.4, textAlign: 'center',
      }}>
        {mode === 'label' ? '拍摄营养标签' : t('log.startLogging')}
      </Text>
      <Text style={{
        fontSize: TYPOGRAPHY.bodyS, fontWeight: '500', color: colors.textSecondary,
        marginBottom: DIMENSIONS.SPACING * 2, textAlign: 'center',
        paddingHorizontal: DIMENSIONS.SPACING * 2, lineHeight: TYPOGRAPHY.bodyS * 1.5,
      }}>
        {mode === 'label'
          ? '将相机对准营养成分表，AI 将自动提取每份卡路里、蛋白质、碳水和脂肪'
          : t('log.takeOrSelect')}
      </Text>

      <TouchableOpacity
        onPress={takePhoto}
        activeOpacity={0.8}
        style={{
          borderRadius: 24, paddingVertical: DIMENSIONS.SPACING * 1.2,
          paddingHorizontal: DIMENSIONS.SPACING * 2,
          alignItems: 'center', justifyContent: 'center',
          marginBottom: DIMENSIONS.SPACING * 0.8,
          minHeight: 64, width: '100%',
          backgroundColor: colors.textPrimary,
          shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: DIMENSIONS.SPACING * 0.6 }}>
          <Ionicons name="camera" size={TYPOGRAPHY.titleM} color={colors.backgroundPrimary} />
          <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.backgroundPrimary }}>
            {t('log.takePhoto')}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={pickImage}
        activeOpacity={0.8}
        style={{
          borderRadius: 24, paddingVertical: DIMENSIONS.SPACING * 1.2,
          paddingHorizontal: DIMENSIONS.SPACING * 2,
          alignItems: 'center', justifyContent: 'center',
          minHeight: 64, width: '100%',
          backgroundColor: colors.cardBackground,
          borderWidth: 2, borderColor: colors.borderPrimary,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: DIMENSIONS.SPACING * 0.6 }}>
          <Ionicons name="images" size={TYPOGRAPHY.titleM} color={colors.textPrimary} />
          <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>
            {t('log.selectFromAlbum')}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundPrimary }} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: DIMENSIONS.CARD_PADDING,
          paddingTop: DIMENSIONS.SPACING * 0.8,
          paddingBottom: 20,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ marginBottom: DIMENSIONS.SPACING }}>
          <Text style={{
            fontSize: TYPOGRAPHY.titleL, fontWeight: '900',
            color: colors.textPrimary, letterSpacing: -2,
            lineHeight: TYPOGRAPHY.titleL * 1.05,
          }}>
            {t('tabs.log')}
          </Text>
          <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '500', color: colors.textSecondary, marginTop: 2 }}>
            {mode === 'barcode' ? '扫描产品条形码查询营养信息' : mode === 'label' ? '拍摄营养成分表提取数据' : t('log.takeOrSelect')}
          </Text>
        </View>

        {/* Mode selector */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: colors.cardBackground,
          borderRadius: 16, borderWidth: 1, borderColor: colors.borderPrimary,
          padding: 4, marginBottom: DIMENSIONS.SPACING * 1.2,
        }}>
          {MODE_CONFIG.map(({ key, icon, label }) => {
            const active = mode === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => handleModeChange(key)}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  paddingVertical: DIMENSIONS.SPACING * 0.5,
                  borderRadius: 12,
                  backgroundColor: active ? colors.textPrimary : 'transparent',
                  gap: 5,
                }}
              >
                <Ionicons
                  name={icon as any}
                  size={TYPOGRAPHY.bodyXS}
                  color={active ? colors.backgroundPrimary : colors.textSecondary}
                />
                <Text style={{
                  fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '800',
                  color: active ? colors.backgroundPrimary : colors.textSecondary,
                }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Barcode mode ── */}
        {mode === 'barcode' && (
          <>
            {lookingUp ? (
              <View style={{
                borderRadius: 24, padding: DIMENSIONS.SPACING * 2.5,
                backgroundColor: colors.cardBackground,
                borderWidth: 1, borderColor: colors.borderPrimary,
                alignItems: 'center', marginBottom: DIMENSIONS.SPACING,
              }}>
                <ActivityIndicator size="large" color={colors.textPrimary} />
                <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '600', color: colors.textSecondary, marginTop: DIMENSIONS.SPACING * 0.8 }}>
                  正在查询产品信息...
                </Text>
              </View>
            ) : result ? null : (
              <BarcodeScanner onScanned={handleBarcodeScan} />
            )}
            {result && (
              <ResultCard
                result={result} isEditing={isEditing} editedData={editedData}
                onEdit={handleEdit} onCancelEdit={handleCancelEdit} onSaveEdit={handleSaveEdit}
                onChange={(k, v) => setEditedData((d) => ({ ...d, [k]: v }))}
                onSaveMeal={saveMeal} saving={saving}
              />
            )}
            {result && !isEditing && (
              <TouchableOpacity
                onPress={() => { setResult(null); setLookingUp(false); }}
                activeOpacity={0.8}
                style={{
                  borderRadius: 16, paddingVertical: DIMENSIONS.SPACING,
                  alignItems: 'center', marginTop: DIMENSIONS.SPACING * 0.6,
                  backgroundColor: colors.cardBackground,
                  borderWidth: 2, borderColor: colors.borderPrimary,
                }}
              >
                <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '700', color: colors.textPrimary }}>
                  重新扫描
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ── Photo / Label modes ── */}
        {mode !== 'barcode' && (
          <>
            {/* Image preview */}
            {image && (
              <View style={{ marginBottom: DIMENSIONS.SPACING }}>
                <View style={{
                  borderRadius: 24, overflow: 'hidden', marginBottom: DIMENSIONS.SPACING,
                  borderWidth: 1, borderColor: colors.borderPrimary,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
                }}>
                  <Image
                    source={{ uri: image }}
                    style={{ width: '100%', height: DIMENSIONS.SCREEN_WIDTH * 0.75 }}
                    resizeMode="cover"
                  />
                </View>

                {!result && (
                  <TouchableOpacity
                    onPress={() => analyzeImage(mode === 'label' ? 'label' : 'food')}
                    disabled={analyzing}
                    activeOpacity={0.8}
                    style={{
                      borderRadius: 24, paddingVertical: DIMENSIONS.SPACING,
                      alignItems: 'center', justifyContent: 'center', minHeight: 56,
                      backgroundColor: colors.textPrimary,
                      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
                    }}
                  >
                    {analyzing ? (
                      <ActivityIndicator color={colors.backgroundPrimary} size="large" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: DIMENSIONS.SPACING * 0.6 }}>
                        <Ionicons
                          name={mode === 'label' ? 'scan' : 'sparkles'}
                          size={TYPOGRAPHY.iconM}
                          color={colors.backgroundPrimary}
                        />
                        <Text style={{ fontSize: TYPOGRAPHY.body, fontWeight: '900', color: colors.backgroundPrimary }}>
                          {mode === 'label' ? '提取营养信息' : t('log.analyzeFood')}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Analysis result */}
            {result && (
              <ResultCard
                result={result} isEditing={isEditing} editedData={editedData}
                onEdit={handleEdit} onCancelEdit={handleCancelEdit} onSaveEdit={handleSaveEdit}
                onChange={(k, v) => setEditedData((d) => ({ ...d, [k]: v }))}
                onSaveMeal={saveMeal} saving={saving}
              />
            )}

            {/* Empty state */}
            {!image && <ImagePickerButtons />}

            {/* Re-pick button */}
            {image && !isEditing && (
              <TouchableOpacity
                onPress={clearImage}
                activeOpacity={0.8}
                style={{
                  borderRadius: 16, paddingVertical: DIMENSIONS.SPACING,
                  alignItems: 'center', marginTop: DIMENSIONS.SPACING * 0.6,
                  backgroundColor: colors.cardBackground,
                  borderWidth: 2, borderColor: colors.borderPrimary,
                }}
              >
                <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '700', color: colors.textPrimary }}>
                  {t('log.selectOtherPhoto')}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
