import { useState, useEffect, useRef } from 'react';
import { Gender, Goal, ExerciseFrequency, ExpectedTimeframe, ThemeMode } from '@/store/useStore';

export function useOnboardingData() {
  const [height, setHeight] = useState(170); // 始终以 cm 存储
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [heightFeet, setHeightFeet] = useState(5); // 英尺
  const [heightInches, setHeightInches] = useState(7); // 英寸
  const [age, setAge] = useState(25);
  const [weight, setWeight] = useState(70); // 始终以 kg 存储
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [weightLb, setWeightLb] = useState(154); // 磅
  const [gender, setGender] = useState<Gender | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [exerciseFrequency, setExerciseFrequency] = useState<ExerciseFrequency | null>(null);
  const [expectedTimeframe, setExpectedTimeframe] = useState<ExpectedTimeframe | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode | null>(null);

  // 初始化默认值
  useEffect(() => {
    if (gender === null) {
      setGender('male');
    }
    if (goal === null) {
      setGoal('lose_weight');
    }
    if (exerciseFrequency === null) {
      setExerciseFrequency('rarely');
    }
    if (expectedTimeframe === null) {
      setExpectedTimeframe('2-3_months');
    }
    if (themeMode === null) {
      setThemeMode('auto');
    }
  }, []);

  // 英尺英寸转厘米：1 ft = 30.48 cm, 1 inch = 2.54 cm
  const convertFeetInchesToCm = (feet: number, inches: number): number => {
    return Math.round(feet * 30.48 + inches * 2.54);
  };

  // 厘米转英尺英寸
  const convertCmToFeetInches = (cm: number): { feet: number; inches: number } => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  };

  // 磅转公斤：1 lb = 0.453592 kg
  const convertLbToKg = (lb: number): number => {
    return Math.round(lb * 0.453592);
  };

  // 公斤转磅
  const convertKgToLb = (kg: number): number => {
    return Math.round(kg / 0.453592);
  };

  // 当使用英尺英寸时，实时转换为厘米
  useEffect(() => {
    if (heightUnit === 'ft') {
      const cm = convertFeetInchesToCm(heightFeet, heightInches);
      setHeight(cm);
    }
  }, [heightFeet, heightInches, heightUnit]);

  // 当从 cm 切换到 ft 时，转换当前值（只在切换时执行一次）
  const previousHeightUnit = useRef<'cm' | 'ft'>('cm');
  useEffect(() => {
    if (heightUnit === 'ft' && previousHeightUnit.current === 'cm' && height > 0) {
      const { feet, inches } = convertCmToFeetInches(height);
      setHeightFeet(feet);
      setHeightInches(inches);
    }
    previousHeightUnit.current = heightUnit;
  }, [heightUnit, height]);

  // 当从 kg 切换到 lb 时，转换当前值（只在切换时执行一次）
  const previousWeightUnit = useRef<'kg' | 'lb'>('kg');
  const weightRef = useRef(weight);
  
  // 保持 weightRef 与 weight 同步
  useEffect(() => {
    weightRef.current = weight;
  }, [weight]);

  useEffect(() => {
    if (weightUnit === 'lb' && previousWeightUnit.current === 'kg' && weightRef.current > 0) {
      const lb = convertKgToLb(weightRef.current);
      setWeightLb(lb);
    }
    previousWeightUnit.current = weightUnit;
  }, [weightUnit]);

  // 当使用磅时，实时转换为公斤（只在 weightUnit 为 lb 时执行，与身高逻辑一致）
  useEffect(() => {
    if (weightUnit === 'lb' && weightLb > 0) {
      const kg = convertLbToKg(weightLb);
      setWeight(kg);
    }
  }, [weightLb, weightUnit]);

  return {
    height,
    setHeight,
    heightUnit,
    setHeightUnit,
    heightFeet,
    setHeightFeet,
    heightInches,
    setHeightInches,
    age,
    setAge,
    weight,
    setWeight,
    weightUnit,
    setWeightUnit,
    weightLb,
    setWeightLb,
    gender,
    setGender,
    goal,
    setGoal,
    exerciseFrequency,
    setExerciseFrequency,
    expectedTimeframe,
    setExpectedTimeframe,
    themeMode,
    setThemeMode,
  };
}

