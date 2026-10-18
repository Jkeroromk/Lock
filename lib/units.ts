import { useStore, type WeightUnit } from '@/store/useStore';

// Weights are stored in kg everywhere (server and plan); only the screens
// convert. 1 kg = 2.20462 lb.
export const LB_PER_KG = 2.20462;

export const kgTo = (kg: number, unit: WeightUnit) => (unit === 'lb' ? kg * LB_PER_KG : kg);
export const toKg = (value: number, unit: WeightUnit) => (unit === 'lb' ? value / LB_PER_KG : value);

/** Display number without trailing zeros: kg to 0.01, lb to 0.1 (80, 77.5, 135). */
export function fmtWeight(kg: number, unit: WeightUnit): string {
  const v = kgTo(kg, unit);
  const step = unit === 'lb' ? 10 : 100;
  return String(Math.round(v * step) / step);
}

/** Same, with the unit: "80 kg", "135 lb". */
export const fmtWeightUnit = (kg: number, unit: WeightUnit) => `${fmtWeight(kg, unit)} ${unit}`;

export const useWeightUnit = () => useStore((s) => s.weightUnit ?? 'kg');
