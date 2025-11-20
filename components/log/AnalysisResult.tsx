import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';

interface AnalysisResultProps {
  result: {
    food: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    confidence: number;
  };
  isEditing: boolean;
  editedData: {
    food: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
  };
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onSaveMeal: () => void;
  setEditedData: (data: any) => void;
}

export default function AnalysisResult({
  result,
  isEditing,
  editedData,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onSaveMeal,
  setEditedData,
}: AnalysisResultProps) {
  const { t } = useTranslation();

  return (
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
                  borderColor: COLORS.borderSecondary,
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
            onPress={onEdit}
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
              color: COLORS.textPrimary,
              backgroundColor: COLORS.cardBackground,
              borderRadius: 8,
              padding: DIMENSIONS.SPACING * 0.4,
              borderWidth: 1,
              borderColor: COLORS.borderSecondary,
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
              color: COLORS.textPrimary,
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
            onPress={onCancelEdit}
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
              borderColor: COLORS.borderPrimary,
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
            onPress={onSaveEdit}
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
          onPress={onSaveMeal}
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
  );
}

