import React from 'react';
import { View, Text, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';
import WheelPickerExpo from 'react-native-wheel-picker-expo';

interface WheelPickerProps {
  items: Array<{ label: string; value: string | number }>;
  selectedValue: string | number;
  onValueChange: (value: string | number) => void;
  itemHeight?: number;
}

export default function CustomWheelPicker({ 
  items, 
  selectedValue, 
  onValueChange,
  itemHeight = 40,
}: WheelPickerProps) {
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [tempSelectedValue, setTempSelectedValue] = React.useState(selectedValue);

  React.useEffect(() => {
    setTempSelectedValue(selectedValue);
  }, [selectedValue]);

  const handleConfirm = () => {
    onValueChange(tempSelectedValue);
    setModalVisible(false);
  };

  const handleCancel = () => {
    setTempSelectedValue(selectedValue);
    setModalVisible(false);
  };

  const selectedItem = React.useMemo(() => 
    items.find(item => item.value === selectedValue),
    [items, selectedValue]
  );
  
  const selectedIndex = React.useMemo(() => 
    items.findIndex(item => item.value === tempSelectedValue),
    [items, tempSelectedValue]
  );

  // 转换 items 格式以匹配库的要求（使用 useMemo 避免重复计算）
  const pickerItems = React.useMemo(() => 
    items.map(item => ({ 
      label: item.label, 
      value: String(item.value) 
    })),
    [items]
  );

  // 使用 useCallback 优化 renderItem，避免每次渲染都重新创建
  const renderItem = React.useCallback(({ label, fontSize, fontColor }: { label: string; fontSize: number; fontColor: string }) => (
    <Text style={{
      fontSize: fontSize * 1.3, // 增大选中字体
      fontWeight: '900',
      color: fontColor,
      textAlign: 'center',
    }}>
      {label}
    </Text>
  ), []);

  // 优化 onChange 回调
  const handleChange = React.useCallback(({ index }: { index: number; item: any }) => {
    if (index >= 0 && index < items.length) {
      setTempSelectedValue(items[index].value);
    }
  }, [items]);

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={styles.button}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>
          {selectedItem?.label || '请选择'}
        </Text>
        <Ionicons name="chevron-down" size={TYPOGRAPHY.iconXS} color={COLORS.textPrimary} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <TouchableWithoutFeedback onPress={handleCancel}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={handleCancel}>
                    <Text style={styles.cancelButton}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleConfirm}>
                    <Text style={styles.confirmButton}>{t('common.confirm')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.pickerContainer}>
                  <WheelPickerExpo
                    items={pickerItems}
                    initialSelectedIndex={selectedIndex >= 0 ? selectedIndex : 0}
                    onChange={handleChange}
                    height={DIMENSIONS.SCREEN_WIDTH * 0.6}
                    width={DIMENSIONS.SCREEN_WIDTH * 0.95}
                    backgroundColor={COLORS.cardBackgroundSecondary}
                    selectedStyle={{
                      borderColor: COLORS.borderPrimary,
                      borderWidth: 1,
                    }}
                    renderItem={renderItem}
                    flatListProps={{
                      removeClippedSubviews: true, // 移除屏幕外的视图以提高性能
                      initialNumToRender: 10, // 初始渲染数量
                      maxToRenderPerBatch: 5, // 每批最大渲染数量
                      updateCellsBatchingPeriod: 50, // 批量更新周期
                      windowSize: 5, // 窗口大小
                    }}
                    haptics={false} // 禁用触觉反馈以提高性能
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = {
  button: {
    padding: DIMENSIONS.SPACING * 0.8,
    backgroundColor: COLORS.cardBackgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSecondary,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  buttonText: {
    fontSize: TYPOGRAPHY.bodyS,
    fontWeight: '700' as const,
    color: COLORS.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: DIMENSIONS.SPACING * 1.5,
    maxHeight: DIMENSIONS.SCREEN_WIDTH * 0.8,
    minHeight: DIMENSIONS.SCREEN_WIDTH * 0.7,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: DIMENSIONS.SPACING * 1.0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderPrimary,
  },
  cancelButton: {
    fontSize: TYPOGRAPHY.bodyS,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
    opacity: 0.7,
  },
  confirmButton: {
    fontSize: TYPOGRAPHY.bodyS,
    fontWeight: '700' as const,
    color: COLORS.textPrimary,
  },
  pickerContainer: {
    height: DIMENSIONS.SCREEN_WIDTH * 0.6,
    width: '100%' as const,
    backgroundColor: COLORS.cardBackgroundSecondary,
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
