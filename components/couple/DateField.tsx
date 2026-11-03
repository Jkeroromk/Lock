import { useMemo } from 'react';
import { View } from 'react-native';
import CustomWheelPicker from '@/components/common/WheelPicker';

/** Year / month / day wheels for a YYYY-MM-DD value (up to today when `pastOnly`). */
export default function DateField({ value, onChange, pastOnly }: {
  value: string;
  onChange: (ymd: string) => void;
  pastOnly?: boolean;
}) {
  const [y, m, d] = value.split('-').map(Number);
  const now = new Date();
  const thisYear = now.getFullYear();
  const years = useMemo(
    () => Array.from({ length: 81 }, (_, i) => thisYear - 70 + i).filter((yy) => !pastOnly || yy <= thisYear).reverse().map((yy) => ({ label: `${yy}`, value: yy })),
    [thisYear, pastOnly],
  );
  const months = Array.from({ length: 12 }, (_, i) => ({ label: String(i + 1).padStart(2, '0'), value: i + 1 }));
  const dim = new Date(y, m, 0).getDate();
  const days = Array.from({ length: dim }, (_, i) => ({ label: String(i + 1).padStart(2, '0'), value: i + 1 }));

  const emit = (yy: number, mm: number, dd: number) => {
    const max = new Date(yy, mm, 0).getDate();
    let date = new Date(yy, mm - 1, Math.min(dd, max));
    if (pastOnly && date > now) date = now;
    onChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
  };

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1.4 }}>
        <CustomWheelPicker items={years} selectedValue={y} onValueChange={(v) => emit(Number(v), m, d)} />
      </View>
      <View style={{ flex: 1 }}>
        <CustomWheelPicker items={months} selectedValue={m} onValueChange={(v) => emit(y, Number(v), d)} />
      </View>
      <View style={{ flex: 1 }}>
        <CustomWheelPicker items={days} selectedValue={d} onValueChange={(v) => emit(y, m, Number(v))} />
      </View>
    </View>
  );
}
