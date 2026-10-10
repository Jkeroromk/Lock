import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { FONTS } from '@/constants/fonts';
import { Card, Label } from '@/components/ui/bxc';

interface HealthStatsCardProps {
  label: string;
  value: number;
  unit?: string;
  goal?: number;
  /** The inverted (paper-on-ink / ink-on-paper) card — use for one card per row. */
  inverse?: boolean;
  /** Short caption under the number, e.g. "64% of 10,000" */
  caption?: string;
}

export default function HealthStatsCard({ label, value, unit, goal, inverse, caption }: HealthStatsCardProps) {
  const c = useTheme();
  const fg = inverse ? c.textInverse : c.textPrimary;
  const muted = inverse ? c.textInverse : c.textSecondary;
  const pct = goal && goal > 0 ? Math.min(value / goal, 1) : 0;
  // Yellow reads on dark surfaces; on light ones use ink.
  const onDark = inverse ? c.surfaceInverse === c.ink : c.backgroundPrimary === c.ink;
  const fill = onDark ? c.accent : c.ink;

  return (
    <Card variant={inverse ? 'inverse' : 'default'} padding={14} style={{ flex: 1 }}>
      <Label color={muted} style={inverse ? { opacity: 0.8 } : undefined}>{label}</Label>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
        <Text style={{ fontSize: 32, fontWeight: '800', letterSpacing: -1.2, color: fg }}>
          {Math.round(value).toLocaleString()}
        </Text>
        {unit ? <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: muted }}>{unit}</Text> : null}
      </View>
      {goal ? (
        <View style={{ height: 6, borderRadius: 3, backgroundColor: inverse ? 'rgba(127,127,127,0.35)' : c.track, marginTop: 10, overflow: 'hidden' }}>
          <View style={{ height: 6, width: `${pct * 100}%`, backgroundColor: fill, borderRadius: 3 }} />
        </View>
      ) : null}
      {caption ? (
        <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: muted, marginTop: 6, opacity: inverse ? 0.8 : 1 }}>{caption}</Text>
      ) : null}
    </Card>
  );
}
