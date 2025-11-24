import { Gender, Goal, ExerciseFrequency, ExpectedTimeframe } from '@/store/useStore';
import HeightSelection from './steps/HeightSelection';
import AgeSelection from './steps/AgeSelection';
import WeightSelection from './steps/WeightSelection';
import GenderSelection from './steps/GenderSelection';
import GoalSelection from './steps/GoalSelection';
import ExerciseFrequencySelection from './steps/ExerciseFrequencySelection';
import ExpectedTimeframeSelection from './steps/ExpectedTimeframeSelection';

interface OnboardingStepsProps {
  step: string;
  // Height
  height: number;
  setHeight: (value: number) => void;
  heightUnit: 'cm' | 'ft';
  setHeightUnit: (unit: 'cm' | 'ft') => void;
  heightFeet: number;
  setHeightFeet: (value: number) => void;
  heightInches: number;
  setHeightInches: (value: number) => void;
  // Age
  age: number;
  setAge: (value: number) => void;
  // Weight
  weight: number;
  setWeight: (value: number) => void;
  weightUnit: 'kg' | 'lb';
  setWeightUnit: (unit: 'kg' | 'lb') => void;
  weightLb: number;
  setWeightLb: (value: number) => void;
  // Gender
  gender: Gender | null;
  setGender: (value: Gender) => void;
  // Goal
  goal: Goal | null;
  setGoal: (value: Goal) => void;
  // Exercise Frequency
  exerciseFrequency: ExerciseFrequency | null;
  setExerciseFrequency: (value: ExerciseFrequency) => void;
  // Expected Timeframe
  expectedTimeframe: ExpectedTimeframe | null;
  setExpectedTimeframe: (value: ExpectedTimeframe) => void;
}

export default function OnboardingSteps({
  step,
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
}: OnboardingStepsProps) {
  switch (step) {
    case 'height':
      return (
        <HeightSelection
          height={height}
          setHeight={setHeight}
          heightUnit={heightUnit}
          setHeightUnit={setHeightUnit}
          heightFeet={heightFeet}
          setHeightFeet={setHeightFeet}
          heightInches={heightInches}
          setHeightInches={setHeightInches}
        />
      );

    case 'age':
      return (
        <AgeSelection
          age={age}
          setAge={setAge}
        />
      );

    case 'weight':
      return (
        <WeightSelection
          weight={weight}
          setWeight={setWeight}
          weightUnit={weightUnit}
          setWeightUnit={setWeightUnit}
          weightLb={weightLb}
          setWeightLb={setWeightLb}
        />
      );

    case 'gender':
      return (
        <GenderSelection
          gender={gender}
          setGender={setGender}
        />
      );

    case 'goal':
      return (
        <GoalSelection
          goal={goal}
          setGoal={setGoal}
        />
      );

    case 'exerciseFrequency':
      return (
        <ExerciseFrequencySelection
          exerciseFrequency={exerciseFrequency}
          setExerciseFrequency={setExerciseFrequency}
        />
      );

    case 'expectedTimeframe':
      return (
        <ExpectedTimeframeSelection
          expectedTimeframe={expectedTimeframe}
          setExpectedTimeframe={setExpectedTimeframe}
        />
      );

    default:
      return null;
  }
}


