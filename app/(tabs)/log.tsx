import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';
import { analyzeFoodImage, logMeal } from '@/services/api';
import { useLocalSearchParams } from 'expo-router';

export default function LogScreen() {
  const { t } = useTranslation();
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      // 暂时禁用API调用，等待后端就绪
      // refreshToday();
    } catch (error: any) {
      Alert.alert(t('log.saveFailed'), error.message || t('log.saveFailed'));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top', 'left', 'right']}>
      <View 
        style={{ 
          flex: 1,
          backgroundColor: COLORS.background,
          paddingHorizontal: DIMENSIONS.CARD_PADDING,
          paddingTop: DIMENSIONS.SPACING * 0.8,
          paddingBottom: Platform.OS === 'ios' ? 20 : 30,
        }}
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
                  borderColor: COLORS.borderPrimary,
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
                    backgroundColor: COLORS.textPrimary,
                    shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 12,
                    elevation: 6,
                }}
              >
                {analyzing ? (
                    <ActivityIndicator color={COLORS.background} size="large" />
                ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="sparkles" size={TYPOGRAPHY.iconM} color={COLORS.background} />
                      <Text 
                        style={{ 
                          fontSize: TYPOGRAPHY.body,
                          fontWeight: '900',
                          color: COLORS.background,
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
                padding: DIMENSIONS.SPACING * 1.4,
                marginBottom: DIMENSIONS.SPACING * 1.2,
                backgroundColor: COLORS.cardBackground,
                borderWidth: 1,
                borderColor: COLORS.borderPrimary,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
              shadowRadius: 12,
                elevation: 6,
            }}
          >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING * 1.2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View 
                    style={{ 
                      width: DIMENSIONS.SCREEN_WIDTH * 0.12,
                      height: DIMENSIONS.SCREEN_WIDTH * 0.12,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: DIMENSIONS.SPACING * 0.8,
                      backgroundColor: COLORS.cardBackgroundSecondary,
                    }}
              >
                    <Ionicons name="checkmark-circle" size={TYPOGRAPHY.iconM} color={COLORS.textPrimary} />
              </View>
                  <View style={{ flex: 1 }}>
                    {isEditing ? (
                      <TextInput
                        value={editedData.food}
                        onChangeText={(text) => setEditedData({ ...editedData, food: text })}
                        style={{
                          fontSize: TYPOGRAPHY.title,
                          fontWeight: '900',
                          color: COLORS.textPrimary,
                          backgroundColor: COLORS.cardBackgroundSecondary,
                          borderRadius: 8,
                          padding: DIMENSIONS.SPACING * 0.4,
                          borderWidth: 1,
                          borderColor: '#3A3A3A',
                          marginBottom: DIMENSIONS.SPACING * 0.3,
                        }}
                        placeholderTextColor="#666"
                      />
                    ) : (
                      <Text 
                        style={{ 
                          fontSize: TYPOGRAPHY.title,
                          fontWeight: '900',
                          marginBottom: DIMENSIONS.SPACING * 0.3,
                          color: COLORS.textPrimary,
                          lineHeight: TYPOGRAPHY.title * 1.2,
                        }}
                      >
                  {result.food}
                </Text>
                    )}
                    <Text 
                      style={{ 
                        fontSize: TYPOGRAPHY.bodyXS,
                        fontWeight: '600',
                        color: COLORS.textPrimary,
                      }}
                    >
                      {t('log.confidence')}：{(result.confidence * 100).toFixed(0)}%
                </Text>
              </View>
                </View>
                {!isEditing && (
                  <TouchableOpacity
                    onPress={handleEdit}
                    style={{
                      padding: DIMENSIONS.SPACING * 0.4,
                      borderRadius: 8,
                    backgroundColor: COLORS.cardBackgroundSecondary,
                    borderWidth: 1,
                    borderColor: COLORS.borderSecondary,
                    }}
                  >
                    <Ionicons name="create-outline" size={TYPOGRAPHY.iconXS} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                )}
            </View>
            
            <View 
                style={{ 
                  borderRadius: 16,
                  padding: DIMENSIONS.SPACING * 1.2,
                  marginBottom: DIMENSIONS.SPACING * 1.2,
                    backgroundColor: COLORS.cardBackgroundSecondary,
                    borderWidth: 1,
                    borderColor: COLORS.borderSecondary,
                }}
              >
                {isEditing ? (
                  <TextInput
                    value={editedData.calories}
                    onChangeText={(text) => setEditedData({ ...editedData, calories: text })}
                    keyboardType="numeric"
                    style={{
                      fontSize: TYPOGRAPHY.numberL,
                      fontWeight: '900',
                      color: '#FFFFFF',
                      backgroundColor: COLORS.cardBackground,
                      borderRadius: 8,
                      padding: DIMENSIONS.SPACING * 0.4,
                      borderWidth: 1,
                      borderColor: '#3A3A3A',
                      marginBottom: DIMENSIONS.SPACING * 0.4,
                      textAlign: 'center',
                    }}
                    placeholderTextColor="#666"
                  />
                ) : (
                  <Text 
                    style={{ 
                      fontSize: TYPOGRAPHY.numberL,
                      fontWeight: '900',
                      marginBottom: DIMENSIONS.SPACING * 0.4,
                      color: '#FFFFFF',
                      lineHeight: TYPOGRAPHY.numberL * 1.1,
                    }}
                  >
                {result.calories}
              </Text>
                )}
                <Text 
                  style={{ 
                    fontSize: TYPOGRAPHY.body,
                    fontWeight: '700',
                    color: COLORS.textPrimary,
                  }}
                >
                  {t('log.calories')}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING * 1.2 }}>
                <View style={{ alignItems: 'center', flex: 1 }}>
                <View 
                    style={{ 
                      width: DIMENSIONS.SCREEN_WIDTH * 0.16,
                      height: DIMENSIONS.SCREEN_WIDTH * 0.16,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: DIMENSIONS.SPACING * 0.6,
                      backgroundColor: COLORS.cardBackgroundSecondary,
                    }}
                >
                    <Ionicons name="barbell" size={TYPOGRAPHY.iconM} color={COLORS.textPrimary} />
                  </View>
                  <Text 
                    style={{ 
                      fontSize: TYPOGRAPHY.bodyXXS,
                      fontWeight: '700',
                      marginBottom: DIMENSIONS.SPACING * 0.3,
                      color: COLORS.textPrimary,
                    }}
                  >
                    {t('log.protein')}
                  </Text>
                  {isEditing ? (
                    <TextInput
                      value={editedData.protein}
                      onChangeText={(text) => setEditedData({ ...editedData, protein: text })}
                      keyboardType="numeric"
                      style={{
                        fontSize: TYPOGRAPHY.bodyL,
                        fontWeight: '900',
                        color: COLORS.textPrimary,
                        backgroundColor: COLORS.cardBackground,
                        borderRadius: 8,
                        padding: DIMENSIONS.SPACING * 0.3,
                        borderWidth: 1,
                        borderColor: COLORS.borderSecondary,
                        textAlign: 'center',
                        minWidth: DIMENSIONS.SCREEN_WIDTH * 0.2,
                      }}
                      placeholderTextColor="#666"
                    />
                  ) : (
                    <Text 
                      style={{ 
                        fontSize: TYPOGRAPHY.bodyL,
                        fontWeight: '900',
                        color: COLORS.textPrimary,
                      }}
                    >
                      {result.protein}g
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <View 
                    style={{ 
                      width: DIMENSIONS.SCREEN_WIDTH * 0.16,
                      height: DIMENSIONS.SCREEN_WIDTH * 0.16,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: DIMENSIONS.SPACING * 0.6,
                      backgroundColor: COLORS.cardBackgroundSecondary,
                    }}
                  >
                    <Ionicons name="nutrition" size={TYPOGRAPHY.iconM} color={COLORS.textPrimary} />
                  </View>
                  <Text 
                    style={{ 
                      fontSize: TYPOGRAPHY.bodyXXS,
                      fontWeight: '700',
                      marginBottom: DIMENSIONS.SPACING * 0.3,
                      color: COLORS.textPrimary,
                    }}
                  >
                    {t('log.carbs')}
                </Text>
                  {isEditing ? (
                    <TextInput
                      value={editedData.carbs}
                      onChangeText={(text) => setEditedData({ ...editedData, carbs: text })}
                      keyboardType="numeric"
                      style={{
                        fontSize: TYPOGRAPHY.bodyL,
                        fontWeight: '900',
                        color: COLORS.textPrimary,
                        backgroundColor: COLORS.cardBackground,
                        borderRadius: 8,
                        padding: DIMENSIONS.SPACING * 0.3,
                        borderWidth: 1,
                        borderColor: COLORS.borderSecondary,
                        textAlign: 'center',
                        minWidth: DIMENSIONS.SCREEN_WIDTH * 0.2,
                      }}
                      placeholderTextColor="#666"
                    />
                  ) : (
                    <Text 
                      style={{ 
                        fontSize: TYPOGRAPHY.bodyL,
                        fontWeight: '900',
                        color: COLORS.textPrimary,
                      }}
                    >
                  {result.carbs}g
                </Text>
                  )}
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <View 
                    style={{ 
                      width: DIMENSIONS.SCREEN_WIDTH * 0.16,
                      height: DIMENSIONS.SCREEN_WIDTH * 0.16,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: DIMENSIONS.SPACING * 0.6,
                      backgroundColor: COLORS.cardBackgroundSecondary,
                    }}
                  >
                    <Ionicons name="water" size={TYPOGRAPHY.iconM} color={COLORS.textPrimary} />
                  </View>
                  <Text 
                    style={{ 
                      fontSize: TYPOGRAPHY.bodyXXS,
                      fontWeight: '700',
                      marginBottom: DIMENSIONS.SPACING * 0.3,
                      color: COLORS.textPrimary,
                    }}
                  >
                    {t('log.fat')}
                </Text>
                  {isEditing ? (
                    <TextInput
                      value={editedData.fat}
                      onChangeText={(text) => setEditedData({ ...editedData, fat: text })}
                      keyboardType="numeric"
                      style={{
                        fontSize: TYPOGRAPHY.bodyL,
                        fontWeight: '900',
                        color: COLORS.textPrimary,
                        backgroundColor: COLORS.cardBackground,
                        borderRadius: 8,
                        padding: DIMENSIONS.SPACING * 0.3,
                        borderWidth: 1,
                        borderColor: COLORS.borderSecondary,
                        textAlign: 'center',
                        minWidth: DIMENSIONS.SCREEN_WIDTH * 0.2,
                      }}
                      placeholderTextColor="#666"
                    />
                  ) : (
                    <Text 
                      style={{ 
                        fontSize: TYPOGRAPHY.bodyL,
                        fontWeight: '900',
                        color: COLORS.textPrimary,
                      }}
                    >
                  {result.fat}g
                </Text>
                  )}
                </View>
              </View>
              
              {isEditing ? (
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                    onPress={handleCancelEdit}
                    activeOpacity={0.8}
                    style={{ 
                      flex: 1,
                      borderRadius: 24,
                      paddingVertical: DIMENSIONS.SPACING,
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 56,
                      backgroundColor: COLORS.cardBackground,
                      borderWidth: 2,
                      borderColor: '#2A2A2A',
                      marginRight: DIMENSIONS.SPACING * 0.6,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="close-circle" size={TYPOGRAPHY.iconM} color={COLORS.textPrimary} />
                      <Text 
                        style={{ 
                          fontSize: TYPOGRAPHY.body,
                          fontWeight: '900',
                          color: COLORS.textPrimary,
                          marginLeft: DIMENSIONS.SPACING * 0.6,
                        }}
                      >
                        {t('log.cancel')}
                      </Text>
            </View>
                  </TouchableOpacity>
            <TouchableOpacity
                    onPress={handleSaveEdit}
                    activeOpacity={0.8}
              style={{ 
                      flex: 1,
                      borderRadius: 24,
                      paddingVertical: DIMENSIONS.SPACING,
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 56,
                      backgroundColor: COLORS.textPrimary,
                      shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 12,
                      elevation: 6,
              }}
            >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="checkmark-circle" size={TYPOGRAPHY.iconM} color={COLORS.background} />
                      <Text 
                        style={{ 
                          fontSize: TYPOGRAPHY.body,
                          fontWeight: '900',
                          color: COLORS.background,
                          marginLeft: DIMENSIONS.SPACING * 0.6,
                        }}
                      >
                        {t('log.saveChanges')}
                </Text>
              </View>
            </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={saveMeal}
                  activeOpacity={0.8}
                  style={{ 
                    borderRadius: 24,
                    paddingVertical: DIMENSIONS.SPACING,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 56,
                    backgroundColor: COLORS.textPrimary,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 12,
                    elevation: 6,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="checkmark-circle" size={TYPOGRAPHY.iconM} color={COLORS.background} />
                    <Text 
                      style={{ 
                        fontSize: TYPOGRAPHY.body,
                        fontWeight: '900',
                        color: COLORS.background,
                        marginLeft: DIMENSIONS.SPACING * 0.6,
                      }}
                    >
                      {t('log.saveMeal')}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
          </View>
        )}

        {/* Action Buttons */}
        {!image && (
            <View style={{ 
              flex: 1,
              justifyContent: 'center', 
              alignItems: 'center',
              backgroundColor: COLORS.background,
            }}>
              <View 
                style={{ 
                  width: DIMENSIONS.SCREEN_WIDTH * 0.3,
                  height: DIMENSIONS.SCREEN_WIDTH * 0.3,
                  borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: DIMENSIONS.SPACING * 2,
                  backgroundColor: COLORS.cardBackground,
                  borderWidth: 2,
                  borderColor: COLORS.borderPrimary,
                }}
              >
                <Ionicons name="camera-outline" size={TYPOGRAPHY.iconXL} color={COLORS.textPrimary} />
              </View>
              
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyL,
                  fontWeight: '900',
                  color: COLORS.textPrimary,
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
                  color: COLORS.textPrimary,
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
                  backgroundColor: COLORS.textPrimary,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.25,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="camera" size={TYPOGRAPHY.titleM} color={COLORS.background} />
                  <Text 
                    style={{ 
                      fontSize: TYPOGRAPHY.bodyM,
                      fontWeight: '900',
                      color: COLORS.background,
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
                  backgroundColor: COLORS.cardBackground,
                borderWidth: 2,
                  borderColor: COLORS.borderPrimary,
              }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="images" size={TYPOGRAPHY.titleM} color={COLORS.textPrimary} />
                  <Text 
                    style={{ 
                      fontSize: TYPOGRAPHY.bodyM,
                      fontWeight: '900',
                      color: COLORS.textPrimary,
                      marginLeft: DIMENSIONS.SPACING * 0.6,
                    }}
                  >
                    {t('log.selectFromAlbum')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
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
                backgroundColor: COLORS.cardBackground,
              borderWidth: 2,
                borderColor: COLORS.borderPrimary,
            }}
          >
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyM,
                  fontWeight: '700',
                  color: COLORS.textPrimary,
                }}
              >
                {t('log.selectOtherPhoto')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
