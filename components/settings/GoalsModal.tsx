import { View, Text, Modal, TextInput, TouchableOpacity } from 'react-native';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';

interface GoalsModalProps {
  visible: boolean;
  calories: string;
  steps: string;
  onCaloriesChange: (value: string) => void;
  onStepsChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function GoalsModal({
  visible,
  calories,
  steps,
  onCaloriesChange,
  onStepsChange,
  onSave,
  onCancel,
}: GoalsModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <View 
          style={{ 
            width: DIMENSIONS.SCREEN_WIDTH * 0.75,
            backgroundColor: COLORS.cardBackground,
            borderRadius: 16,
            padding: DIMENSIONS.SPACING * 1.2,
            alignItems: 'center',
            borderWidth: 2,
            borderColor: COLORS.borderPrimary,
          }}
        >
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.bodyM,
              fontWeight: '900',
              color: COLORS.textPrimary,
              marginBottom: DIMENSIONS.SPACING * 1.0,
            }}
          >
            {t('settings.editGoals')}
          </Text>
          <View style={{ width: '100%', marginBottom: DIMENSIONS.SPACING * 0.8 }}>
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.bodyXS,
                fontWeight: '700',
                color: COLORS.textPrimary,
                marginBottom: DIMENSIONS.SPACING * 0.4,
              }}
            >
              {t('settings.kcalPerDay')}
            </Text>
            <TextInput
              style={{
                width: '100%',
                padding: DIMENSIONS.SPACING * 0.8,
                backgroundColor: COLORS.cardBackgroundSecondary,
                borderRadius: 12,
                color: COLORS.textPrimary,
                fontSize: TYPOGRAPHY.bodyS,
                fontWeight: '700',
                borderWidth: 1,
                borderColor: COLORS.borderSecondary,
              }}
              placeholder={t('settings.dailyCaloriesPlaceholder')}
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="numeric"
              value={calories}
              onChangeText={onCaloriesChange}
            />
          </View>
          <View style={{ width: '100%', marginBottom: DIMENSIONS.SPACING * 1.0 }}>
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.bodyXS,
                fontWeight: '700',
                color: COLORS.textPrimary,
                marginBottom: DIMENSIONS.SPACING * 0.4,
              }}
            >
              {t('settings.stepsPerDay')}
            </Text>
            <TextInput
              style={{
                width: '100%',
                padding: DIMENSIONS.SPACING * 0.8,
                backgroundColor: COLORS.cardBackgroundSecondary,
                borderRadius: 12,
                color: COLORS.textPrimary,
                fontSize: TYPOGRAPHY.bodyS,
                fontWeight: '700',
                borderWidth: 1,
                borderColor: COLORS.borderSecondary,
              }}
              placeholder={t('settings.dailyStepsPlaceholder')}
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="numeric"
              value={steps}
              onChangeText={onStepsChange}
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
            <TouchableOpacity
              onPress={onCancel}
              style={{
                flex: 1,
                paddingVertical: DIMENSIONS.SPACING * 0.6,
                borderRadius: 12,
                backgroundColor: COLORS.cardBackgroundSecondary,
                marginRight: DIMENSIONS.SPACING * 0.4,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: COLORS.borderSecondary,
              }}
            >
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyS,
                  fontWeight: '700',
                  color: COLORS.textPrimary,
                }}
              >
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSave}
              style={{
                flex: 1,
                paddingVertical: DIMENSIONS.SPACING * 0.6,
                borderRadius: 12,
                backgroundColor: COLORS.textPrimary,
                marginLeft: DIMENSIONS.SPACING * 0.4,
                alignItems: 'center',
              }}
            >
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyS,
                  fontWeight: '700',
                  color: COLORS.backgroundPrimary,
                }}
              >
                {t('common.save')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

