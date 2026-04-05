import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

interface HealthStatsCardProps {
  icon: string;
  label: string;
  value: string | number;
  unit?: string;
  accentColor?: string;
  goal?: number;
}

export default function HealthStatsCard({ icon, label, value, unit, goal }: HealthStatsCardProps) {
  const colors = useTheme();
  const numVal = typeof value === 'number' ? value : parseFloat(value as string) || 0;
  const progressPct = goal && goal > 0 ? Math.min(numVal / goal, 1) : null;

  return (
    <View style={{
      flex: 1,
      borderRadius: 20,
      backgroundColor: colors.cardBackground,
      borderWidth: 1, borderColor: colors.borderPrimary,
      overflow: 'hidden',
    }}>
      <View style={{ padding: DIMENSIONS.SPACING * 0.9 }}>
        {/* Icon + label */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 0.6, gap: 6 }}>
          <View style={{
            width: 30, height: 30, borderRadius: 9,
            backgroundColor: colors.cardBackgroundSecondary,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name={icon as any} size={TYPOGRAPHY.bodyM} color={colors.textPrimary} />
          </View>
          <Text style={{
            fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700',
            color: colors.textSecondary, textTransform: 'uppercase',
            letterSpacing: 0.8, flex: 1,
          }} numberOfLines={1}>
            {label}
          </Text>
        </View>

        {/* Value */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
          <Text style={{
            fontSize: TYPOGRAPHY.numberS, fontWeight: '900',
            color: colors.textPrimary, letterSpacing: -1,
            lineHeight: TYPOGRAPHY.numberS * 1,
          }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Text>
          {unit && (
            <Text style={{
              fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700',
              color: colors.textSecondary,
            }}>
              {unit}
            </Text>
          )}
        </View>

        {/* Optional progress bar */}
        {progressPct !== null && (
          <View style={{
            height: 3, borderRadius: 2,
            backgroundColor: colors.cardBackgroundSecondary,
            marginTop: DIMENSIONS.SPACING * 0.5,
            overflow: 'hidden',
          }}>
            <View style={{
              height: '100%', borderRadius: 2,
              width: `${progressPct * 100}%`,
              backgroundColor: colors.textPrimary, opacity: 0.8,
            }} />
          </View>
        )}
      </View>
    </View>
  );
}
