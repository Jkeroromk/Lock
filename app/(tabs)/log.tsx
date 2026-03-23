import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { analyzeFoodImage, logMeal } from '@/services/api';
import { useLocalSearchParams } from 'expo-router';

export default function LogScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const params = useLocalSearchParams();
  const [image, setImage] = useState<string | null>(null);
  
  // 如果从tab按钮传递了图片URI，设置图片
  useEffect(() => {
    if (params.imageUri && typeof params.imageUri === 'string') {
      setImage(params.imageUri);
      setResult(null);
    }
  }, [params.imageUri]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    food: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });
  const { refreshToday } = useStore();

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert(t('common.error'), t('log.needPermission') || '我们需要访问您的照片以选择食物图片');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
      setResult(null);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert(t('common.error'), t('log.needPermission') || '我们需要访问相机以拍摄食物照片');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
      setResult(null);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;

    setAnalyzing(true);
    try {
      const analysis = await analyzeFoodImage(image);
      setResult(analysis);
      setEditedData({
        food: analysis.food || '',
        calories: String(analysis.calories || 0),
        protein: String(analysis.protein || 0),
        carbs: String(analysis.carbs || 0),
        fat: String(analysis.fat || 0),
      });
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert(t('log.analysisFailed'), error.message || t('log.analysisFailed'));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedData({
      food: result.food || '',
      calories: String(result.calories || 0),
      protein: String(result.protein || 0),
      carbs: String(result.carbs || 0),
      fat: String(result.fat || 0),
    });
  };

  const handleSaveEdit = () => {
    const updatedResult = {
      ...result,
      food: editedData.food || result.food,
      calories: parseFloat(editedData.calories) || result.calories,
      protein: parseFloat(editedData.protein) || result.protein,
      carbs: parseFloat(editedData.carbs) || result.carbs,
      fat: parseFloat(editedData.fat) || result.fat,
    };
    setResult(updatedResult);
    setIsEditing(false);
  };

  const saveMeal = async () => {
    if (!result) return;

    // 如果正在编辑，先保存编辑
    if (isEditing) {
      handleSaveEdit();
      return;
    }

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
      setImage(null);
      setResult(null);
      setIsEditing(false);
      refreshToday();
    } catch (error: any) {
      Alert.alert(t('log.saveFailed'), error.message || t('log.saveFailed'));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingHorizontal: DIMENSIONS.CARD_PADDING,
          paddingTop: DIMENSIONS.SPACING * 0.8,
          paddingBottom: 20,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Image Preview */}
        {image && (
            <View style={{ marginBottom: DIMENSIONS.SPACING * 1.2 }}>
            <View 
              style={{
                  borderRadius: 24,
                  overflow: 'hidden',
                  marginBottom: DIMENSIONS.SPACING,
                  borderWidth: 1,
                  borderColor: colors.borderPrimary,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                shadowRadius: 12,
                  elevation: 6,
              }}
            >
              <Image
                source={{ uri: image }}
                      style={{ width: '100%', height: DIMENSIONS.SCREEN_WIDTH * 0.8 }}
                resizeMode="cover"
              />
            </View>
            {!result && (
              <TouchableOpacity
                onPress={analyzeImage}
                disabled={analyzing}
                  activeOpacity={0.8}
                style={{ 
                    borderRadius: 24,
                    paddingVertical: DIMENSIONS.SPACING,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 56,
                    backgroundColor: colors.textPrimary,
                    shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 12,
                    elevation: 6,
                }}
              >
                {analyzing ? (
                    <ActivityIndicator color={colors.background} size="large" />
                ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="sparkles" size={TYPOGRAPHY.iconM} color={colors.background} />
                      <Text 
                        style={{ 
                          fontSize: TYPOGRAPHY.body,
                          fontWeight: '900',
                          color: colors.background,
                          marginLeft: DIMENSIONS.SPACING * 0.6,
                        }}
                      >
                        {t('log.analyzeFood')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Analysis Result */}
        {result && (
          <View
            style={{
              borderRadius: 24,
              marginBottom: DIMENSIONS.SPACING * 1.2,
              backgroundColor: colors.cardBackground,
              borderWidth: 1,
              borderColor: colors.borderPrimary,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            {/* Food name header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: DIMENSIONS.SPACING * 1.2,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderPrimary,
            }}>
              <View style={{ flex: 1 }}>
                {isEditing ? (
                  <TextInput
                    value={editedData.food}
                    onChangeText={(text) => setEditedData({ ...editedData, food: text })}
                    style={{
                      fontSize: TYPOGRAPHY.title,
                      fontWeight: '900',
                      color: colors.textPrimary,
                      backgroundColor: colors.cardBackgroundSecondary,
                      borderRadius: 10,
                      paddingHorizontal: DIMENSIONS.SPACING * 0.6,
                      paddingVertical: DIMENSIONS.SPACING * 0.4,
                      borderWidth: 1,
                      borderColor: colors.borderSecondary,
                    }}
                    placeholderTextColor={colors.textSecondary}
                  />
                ) : (
                  <Text style={{
                    fontSize: TYPOGRAPHY.title,
                    fontWeight: '900',
                    color: colors.textPrimary,
                    lineHeight: TYPOGRAPHY.title * 1.2,
                  }}>
                    {result.food}
                  </Text>
                )}
                <Text style={{
                  fontSize: TYPOGRAPHY.bodyXXS,
                  fontWeight: '600',
                  color: colors.textSecondary,
                  marginTop: 4,
                }}>
                  {t('log.confidence')}：{(result.confidence * 100).toFixed(0)}%
                </Text>
              </View>
              {!isEditing && (
                <TouchableOpacity
                  onPress={handleEdit}
                  style={{
                    padding: DIMENSIONS.SPACING * 0.6,
                    borderRadius: 10,
                    backgroundColor: colors.cardBackgroundSecondary,
                    borderWidth: 1,
                    borderColor: colors.borderSecondary,
                    marginLeft: DIMENSIONS.SPACING * 0.8,
                  }}
                >
                  <Ionicons name="create-outline" size={TYPOGRAPHY.iconXS} color={colors.textPrimary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Calories */}
            <View style={{
              paddingHorizontal: DIMENSIONS.SPACING * 1.4,
              paddingVertical: DIMENSIONS.SPACING * 1.2,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderPrimary,
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: 8,
            }}>
              {isEditing ? (
                <TextInput
                  value={editedData.calories}
                  onChangeText={(text) => setEditedData({ ...editedData, calories: text })}
                  keyboardType="numeric"
                  style={{
                    fontSize: TYPOGRAPHY.numberL,
                    fontWeight: '900',
                    color: colors.textPrimary,
                    backgroundColor: colors.cardBackgroundSecondary,
                    borderRadius: 10,
                    paddingHorizontal: DIMENSIONS.SPACING * 0.6,
                    paddingVertical: DIMENSIONS.SPACING * 0.3,
                    borderWidth: 1,
                    borderColor: colors.borderSecondary,
                    minWidth: 120,
                  }}
                  placeholderTextColor={colors.textSecondary}
                />
              ) : (
                <Text style={{
                  fontSize: TYPOGRAPHY.numberL,
                  fontWeight: '900',
                  color: colors.textPrimary,
                  lineHeight: TYPOGRAPHY.numberL * 1.05,
                }}>
                  {result.calories}
                </Text>
              )}
              <Text style={{
                fontSize: TYPOGRAPHY.bodyM,
                fontWeight: '700',
                color: colors.textSecondary,
                marginBottom: 6,
              }}>
                {t('log.calories')}
              </Text>
            </View>

            {/* Macros */}
            <View style={{
              flexDirection: 'row',
              padding: DIMENSIONS.SPACING * 1.2,
            }}>
              {[
                { label: t('log.protein'), key: 'protein', color: colors.proteinColor },
                { label: t('log.carbs'), key: 'carbs', color: colors.carbsColor },
                { label: t('log.fat'), key: 'fat', color: colors.fatColor },
              ].map((macro, i) => (
                <View key={macro.key} style={{
                  flex: 1,
                  alignItems: 'center',
                  borderLeftWidth: i > 0 ? 1 : 0,
                  borderLeftColor: colors.borderPrimary,
                }}>
                  <Text style={{
                    fontSize: TYPOGRAPHY.bodyXXS,
                    fontWeight: '700',
                    color: colors.textSecondary,
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}>
                    {macro.label}
                  </Text>
                  {isEditing ? (
                    <TextInput
                      value={editedData[macro.key as keyof typeof editedData]}
                      onChangeText={(text) => setEditedData({ ...editedData, [macro.key]: text })}
                      keyboardType="numeric"
                      style={{
                        fontSize: TYPOGRAPHY.bodyL,
                        fontWeight: '900',
                        color: macro.color,
                        backgroundColor: colors.cardBackgroundSecondary,
                        borderRadius: 8,
                        paddingHorizontal: DIMENSIONS.SPACING * 0.5,
                        paddingVertical: DIMENSIONS.SPACING * 0.3,
                        borderWidth: 1,
                        borderColor: colors.borderSecondary,
                        textAlign: 'center',
                        minWidth: DIMENSIONS.SCREEN_WIDTH * 0.18,
                      }}
                      placeholderTextColor={colors.textSecondary}
                    />
                  ) : (
                    <Text style={{
                      fontSize: TYPOGRAPHY.bodyL,
                      fontWeight: '900',
                      color: macro.color,
                    }}>
                      {(result as any)[macro.key]}g
                    </Text>
                  )}
                </View>
              ))}
            </View>
              
            {/* Buttons */}
            <View style={{
              flexDirection: 'row',
              gap: DIMENSIONS.SPACING * 0.6,
              padding: DIMENSIONS.SPACING * 1.2,
              borderTopWidth: 1,
              borderTopColor: colors.borderPrimary,
            }}>
              {isEditing ? (
                <>
                  <TouchableOpacity
                    onPress={handleCancelEdit}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      borderRadius: 16,
                      paddingVertical: DIMENSIONS.SPACING * 0.9,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.cardBackgroundSecondary,
                      borderWidth: 1,
                      borderColor: colors.borderSecondary,
                    }}
                  >
                    <Text style={{ fontSize: TYPOGRAPHY.body, fontWeight: '800', color: colors.textPrimary }}>
                      {t('log.cancel')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveEdit}
                    activeOpacity={0.8}
                    style={{
                      flex: 2,
                      borderRadius: 16,
                      paddingVertical: DIMENSIONS.SPACING * 0.9,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.textPrimary,
                    }}
                  >
                    <Text style={{ fontSize: TYPOGRAPHY.body, fontWeight: '800', color: colors.background }}>
                      {t('log.saveChanges')}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  onPress={saveMeal}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    paddingVertical: DIMENSIONS.SPACING * 0.9,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.textPrimary,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="checkmark-circle" size={TYPOGRAPHY.iconS} color={colors.background} />
                    <Text style={{ fontSize: TYPOGRAPHY.body, fontWeight: '800', color: colors.background }}>
                      {t('log.saveMeal')}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {!image && (
            <View style={{ 
              flex: 1,
              justifyContent: 'center', 
              alignItems: 'center',
              backgroundColor: colors.background,
            }}>
              <View 
                style={{ 
                  width: DIMENSIONS.SCREEN_WIDTH * 0.3,
                  height: DIMENSIONS.SCREEN_WIDTH * 0.3,
                  borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: DIMENSIONS.SPACING * 2,
                  backgroundColor: colors.cardBackground,
                  borderWidth: 2,
                  borderColor: colors.borderPrimary,
                }}
              >
                <Ionicons name="camera-outline" size={TYPOGRAPHY.iconXL} color={colors.textPrimary} />
              </View>
              
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyL,
                  fontWeight: '900',
                  color: colors.textPrimary,
                  marginBottom: DIMENSIONS.SPACING * 0.4,
                  textAlign: 'center',
                }}
              >
                {t('log.startLogging')}
              </Text>
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyS,
                  fontWeight: '500',
                  color: colors.textPrimary,
                  marginBottom: DIMENSIONS.SPACING * 2,
                  textAlign: 'center',
                  paddingHorizontal: DIMENSIONS.SPACING * 2,
                  lineHeight: TYPOGRAPHY.bodyS * 1.5,
                }}
              >
                {t('log.takeOrSelect')}
              </Text>
              
            <TouchableOpacity
              onPress={takePhoto}
                activeOpacity={0.8}
              style={{ 
                  borderRadius: 24,
                  paddingVertical: DIMENSIONS.SPACING * 1.2,
                  paddingHorizontal: DIMENSIONS.SPACING * 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: DIMENSIONS.SPACING * 0.8,
                  minHeight: 64,
                  width: '100%',
                  backgroundColor: colors.textPrimary,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.25,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="camera" size={TYPOGRAPHY.titleM} color={colors.background} />
                  <Text 
                    style={{ 
                      fontSize: TYPOGRAPHY.bodyM,
                      fontWeight: '900',
                      color: colors.background,
                      marginLeft: DIMENSIONS.SPACING * 0.6,
                    }}
                  >
                    {t('log.takePhoto')}
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={pickImage}
                activeOpacity={0.8}
              style={{ 
                  borderRadius: 24,
                  paddingVertical: DIMENSIONS.SPACING * 1.2,
                  paddingHorizontal: DIMENSIONS.SPACING * 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 64,
                  width: '100%',
                  backgroundColor: colors.cardBackground,
                borderWidth: 2,
                  borderColor: colors.borderPrimary,
              }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="images" size={TYPOGRAPHY.titleM} color={colors.textPrimary} />
                  <Text 
                    style={{ 
                      fontSize: TYPOGRAPHY.bodyM,
                      fontWeight: '900',
                      color: colors.textPrimary,
                      marginLeft: DIMENSIONS.SPACING * 0.6,
                    }}
                  >
                    {t('log.selectFromAlbum')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {image && result && !isEditing && (
          <TouchableOpacity
            onPress={() => {
              setImage(null);
              setResult(null);
            }}
            activeOpacity={0.8}
            style={{
              borderRadius: 16,
              paddingVertical: DIMENSIONS.SPACING,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 48,
              marginTop: DIMENSIONS.SPACING * 0.6,
              backgroundColor: colors.cardBackground,
              borderWidth: 2,
              borderColor: colors.borderPrimary,
            }}
          >
            <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '700', color: colors.textPrimary }}>
              {t('log.selectOtherPhoto')}
            </Text>
          </TouchableOpacity>
        )}

        {image && !result && (
          <TouchableOpacity
            onPress={() => {
              setImage(null);
              setResult(null);
            }}
              activeOpacity={0.8}
            style={{ 
                borderRadius: 16,
                paddingVertical: DIMENSIONS.SPACING,
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 48,
                backgroundColor: colors.cardBackground,
              borderWidth: 2,
                borderColor: colors.borderPrimary,
            }}
          >
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyM,
                  fontWeight: '700',
                  color: colors.textPrimary,
                }}
              >
                {t('log.selectOtherPhoto')}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
