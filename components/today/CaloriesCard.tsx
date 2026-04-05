import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { useStore } from '@/store/useStore';

interface CaloriesCardProps {
  todayCalories: number;
  calorieProgress: number;
  remainingCalories: number;
}

function SvgRing({ progress, size }: { progress: number; size: number }) {
  const colors = useTheme();
  const strokeWidth = size * 0.09;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(Math.max(progress / 100, 0), 1);
  const dashOffset = circumference * (1 - clampedPct);
  const done = progress >= 100;
  const ringColor = done ? '#10B981' : colors.textPrimary;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Background track */}
        <Circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={colors.cardBackgroundSecondary}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        {clampedPct > 0 && (
          <Circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${cx}, ${cy}`}
          />
        )}
      </Svg>

      {/* Center label */}
      <View style={{ alignItems: 'center' }}>
        <Text style={{
          fontSize: TYPOGRAPHY.numberS * 0.85,
          fontWeight: '900',
          color: ringColor,
          letterSpacing: -1,
          lineHeight: TYPOGRAPHY.numberS * 0.85,
        }}>
          {Math.round(progress)}
        </Text>
        <Text style={{
          fontSize: TYPOGRAPHY.bodyXXS,
          fontWeight: '700',
          color: colors.textSecondary,
          letterSpacing: 1,
          marginTop: 2,
        }}>
          %
        </Text>
      </View>
    </View>
  );
}

export default function CaloriesCard({ todayCalories, calorieProgress, remainingCalories }: CaloriesCardProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const { dailyCalorieGoal } = useStore();

  const ringSize = DIMENSIONS.SCREEN_WIDTH * 0.34;
  const done = calorieProgress >= 100;

  return (
    <View style={{
      borderRadius: 24,
      backgroundColor: colors.cardBackground,
      borderWidth: 1, borderColor: colors.borderPrimary,
      marginBottom: DIMENSIONS.SPACING,
      overflow: 'hidden',
    }}>
      {/* Main row */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        padding: DIMENSIONS.SPACING * 1.1,
        gap: DIMENSIONS.SPACING * 1.0,
      }}>
        <SvgRing progress={calorieProgress} size={ringSize} />

        {/* Right stats */}
        <View style={{ flex: 1, gap: DIMENSIONS.SPACING * 0.65 }}>
          {/* Calories eaten */}
          <View>
            <Text style={{
              fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700',
              color: colors.textSecondary, textTransform: 'uppercase',
              letterSpacing: 1.2, marginBottom: 3,
            }}>
              {t('today.todayCalories')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={{
                fontSize: TYPOGRAPHY.numberL, fontWeight: '900',
                color: done ? '#10B981' : colors.textPrimary,
                letterSpacing: -3,
                lineHeight: TYPOGRAPHY.numberL,
              }}>
                {todayCalories.toLocaleString()}
              </Text>
              <Text style={{
                fontSize: TYPOGRAPHY.bodyS, fontWeight: '700',
                color: colors.textSecondary,
              }}>
                {t('today.kcal')}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: colors.borderPrimary }} />

          {/* Target + Remaining */}
          <View style={{ gap: DIMENSIONS.SPACING * 0.3 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{
                fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600',
                color: colors.textSecondary,
              }}>
                {t('today.target')}
              </Text>
              <Text style={{
                fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '800',
                color: colors.textPrimary,
              }}>
                {dailyCalorieGoal.toLocaleString()} {t('today.kcal')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{
                fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600',
                color: colors.textSecondary,
              }}>
                {t('today.remaining')}
              </Text>
              <Text style={{
                fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '800',
                color: done ? '#10B981' : colors.textPrimary,
              }}>
                {done ? '✓ Done' : `${remainingCalories.toLocaleString()} ${t('today.kcal')}`}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom progress bar */}
      <View style={{ height: 4, backgroundColor: colors.cardBackgroundSecondary }}>
        <View style={{
          height: '100%',
          width: `${Math.min(calorieProgress, 100)}%`,
          backgroundColor: done ? '#10B981' : colors.textPrimary,
        }} />
      </View>
    </View>
  );
}
