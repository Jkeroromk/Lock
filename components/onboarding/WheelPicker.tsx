import { StyleSheet, View } from 'react-native';
import { useMemo, useEffect, useRef } from 'react';
import WheelPicker from '@quidone/react-native-wheel-picker';
import { COLORS } from '@/constants';

interface WheelPickerOption<T = string | number> {
  label: string | number;
  value: T;
}

interface WheelPickerProps<T extends string | number = number> {
  options: WheelPickerOption<T>[];
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
  infinite?: boolean;
  visibleCount?: number;
  optionItemHeight?: number;
  // 兼容旧 API
  items?: number[];
  selectedValue?: number;
  unit?: string;
  itemHeight?: number;
}

export default function CustomWheelPicker<T extends string | number = number>({
  options: optionsProp,
  value: valueProp,
  defaultValue,
  onValueChange,
  visibleCount = 7,
  optionItemHeight = 50,
  // 兼容旧 API
  items,
  selectedValue,
  unit,
  itemHeight = 50,
}: WheelPickerProps<T>) {
  // 兼容旧 API：如果提供了 items，转换为 options
  const options = useMemo(() => {
    if (optionsProp) {
      return optionsProp;
    }
    if (items) {
      return items.map((item) => ({
        label: `${item}${unit ? ` ${unit}` : ''}`,
        value: item as T,
      }));
    }
    return [];
  }, [optionsProp, items, unit]);

  // 兼容旧 API：如果提供了 selectedValue，使用它
  const currentValue: T = (valueProp ?? selectedValue ?? defaultValue ?? options[0]?.value) as T;
  const itemHeightToUse = optionItemHeight || itemHeight;
  const visibleItemCount = visibleCount || 7;

  // 转换为 @quidone/react-native-wheel-picker 需要的数据格式
  // 这个库需要 data 数组，每个元素有 value 和 label 属性
  const data = useMemo(
    () =>
      options.map((opt) => ({
        value: opt.value,
        label: String(opt.label),
      })),
    [options]
  );

  const handleValueChanged = ({ item }: { item: { value: T } }) => {
    if (onValueChange) {
      onValueChange(item.value);
    }
  };

  // 修复：当默认值是第一个选项时，确保触发 onValueChange
  // 同时修复重新挂载时的定位问题
  const hasInitialized = useRef(false);
  const previousValue = useRef<T | undefined>(currentValue);
  const keyRef = useRef(0); // 用于强制重新渲染
  const mountedRef = useRef(false);
  
  // 组件挂载时重置状态
  useEffect(() => {
    mountedRef.current = true;
    hasInitialized.current = false;
    previousValue.current = currentValue;
    keyRef.current += 1; // 强制重新渲染
    return () => {
      mountedRef.current = false;
    };
  }, []); // 只在挂载时执行
  
  useEffect(() => {
    // 如果值改变了，重置初始化状态，强制重新定位
    if (currentValue !== previousValue.current) {
      hasInitialized.current = false;
      previousValue.current = currentValue;
      keyRef.current += 1; // 强制重新渲染
    }
    
    // 只在组件首次挂载或值改变时触发
    if (!hasInitialized.current && onValueChange && currentValue !== undefined && options.length > 0 && mountedRef.current) {
      // 延迟触发，确保组件已完全渲染
      const timer = setTimeout(() => {
        if (onValueChange && mountedRef.current) {
          onValueChange(currentValue);
        }
        hasInitialized.current = true;
      }, 300); // 增加延迟，确保组件完全渲染和定位
      return () => clearTimeout(timer);
    }
  }, [currentValue, onValueChange, options.length]);

  return (
    <View key={keyRef.current} style={{ width: '100%' }}>
      <WheelPicker
        data={data}
        value={currentValue}
        onValueChanged={handleValueChanged}
        itemHeight={itemHeightToUse}
        visibleItemCount={visibleItemCount}
        width="100%"
        style={styles.container}
        itemTextStyle={styles.itemText}
        overlayItemStyle={styles.overlayItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.cardBackground,
    borderWidth: 2,
    borderColor: COLORS.borderPrimary,
  },
  itemText: {
    color: COLORS.textPrimary,
  },
  overlayItem: {
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: COLORS.textPrimary,
  },
});
