import { View, Modal, Alert, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button, Card, Label, PressScale, TextField } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { fetchWeightRecords, logWeight, type WeightRecord } from '@/services/weight';
import { fmtWeight, kgTo, toKg, useWeightUnit } from '@/lib/units';
import { useStore } from '@/store/useStore';

const RANGES = [30, 90] as const;
const CHART_H = 110;

/** Body weight on the training tab: latest, change, a curve, and quick logging. */
export default function WeightCard({ refreshKey = 0 }: { refreshKey?: number }) {
  const c = useTheme();
  const { t, language } = useTranslation();
  const unit = useWeightUnit();
  const [records, setRecords] = useState<WeightRecord[] | null>(null);
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const [width, setWidth] = useState(0);
  const [logging, setLogging] = useState(false);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => fetchWeightRecords().then(setRecords).catch(() => setRecords((r) => r ?? []));
  useEffect(() => { load(); }, [refreshKey]);

  // Oldest → newest within the range.
  const points = useMemo(() => {
    if (!records) return [];
    const since = Date.now() - range * 86400_000;
    return records
      .map((r) => ({ t: new Date(r.recordedAt).getTime(), kg: Number(r.weight) }))
      .filter((p) => p.t >= since && Number.isFinite(p.kg))
      .sort((a, b) => a.t - b.t);
  }, [records, range]);

  const latest = records?.[0] ? Number(records[0].weight) : null;
  const previous = records?.[1] ? Number(records[1].weight) : null;
  const delta = latest !== null && previous !== null ? kgTo(latest - previous, unit) : null;
  const rangeChange = points.length > 1 ? kgTo(points[points.length - 1].kg - points[0].kg, unit) : null;

  const chart = useMemo(() => {
    if (points.length < 2 || width <= 0) return null;
    const pad = 8;
    const ys = points.map((p) => p.kg);
    let lo = Math.min(...ys);
    let hi = Math.max(...ys);
    if (hi - lo < 1) { const mid = (hi + lo) / 2; lo = mid - 0.5; hi = mid + 0.5; }
    const t0 = points[0].t;
    const t1 = points[points.length - 1].t || t0 + 1;
    const x = (tm: number) => pad + ((tm - t0) / Math.max(1, t1 - t0)) * (width - pad * 2);
    const y = (kg: number) => pad + (1 - (kg - lo) / (hi - lo)) * (CHART_H - pad * 2);
    const xy = points.map((p) => [x(p.t), y(p.kg)] as const);
    const line = xy.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
    const area = `${line} L${xy[xy.length - 1][0].toFixed(1)},${CHART_H} L${xy[0][0].toFixed(1)},${CHART_H} Z`;
    return { line, area, last: xy[xy.length - 1], hi, lo, mid: y((hi + lo) / 2) };
  }, [points, width]);

  // v is already in the display unit.
  const signed = (v: number) => `${v > 0.04 ? '+' : v < -0.04 ? '−' : '±'}${Math.round(Math.abs(v) * 10) / 10}`;

  const openLog = () => {
    setInput(latest !== null ? fmtWeight(latest, unit) : '');
    setLogging(true);
  };

  const save = async () => {
    const v = parseFloat(input.replace(',', '.'));
    const kg = toKg(v, unit);
    if (!Number.isFinite(kg) || kg < 20 || kg > 500) {
      Alert.alert(t('weightTracker.invalidWeight'), t('weightTracker.invalidWeightHint'));
      return;
    }
    setSaving(true);
    try {
      await logWeight(Math.round(kg * 100) / 100);
      useStore.getState().noteWeight(Math.round(kg * 100) / 100);
      setLogging(false);
      await load();
    } catch {
      Alert.alert(t('weightTracker.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card padding={16} style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Label>{t('train.weight')}</Label>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {RANGES.map((r) => (
            <PressScale
              key={r}
              onPress={() => setRange(r)}
              accessibilityRole="button"
              accessibilityState={{ selected: range === r }}
              style={{
                paddingHorizontal: 9, height: 28, borderRadius: 9, justifyContent: 'center',
                borderWidth: 1.5, borderColor: range === r ? c.textPrimary : c.borderSecondary,
                backgroundColor: range === r ? c.textPrimary : 'transparent',
              }}
            >
              <Text style={{ fontFamily: FONTS.mono, fontSize: 11, fontWeight: '600', color: range === r ? c.backgroundPrimary : c.textSecondary }}>
                {t('train.rangeDays', { n: String(r) })}
              </Text>
            </PressScale>
          ))}
        </View>
      </View>

      {records === null ? (
        <View style={{ height: CHART_H + 50 }} />
      ) : latest === null ? (
        <View style={{ paddingVertical: 14, gap: 12 }}>
          <Text style={{ fontSize: 15, color: c.textSecondary }}>{t('weightTracker.noRecordsHint')}</Text>
          <Button variant="outline" icon="add" label={t('weightTracker.logWeight')} onPress={openLog} />
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={{ fontSize: 34, fontWeight: '800', letterSpacing: -1.2, color: c.textPrimary }}>{fmtWeight(latest, unit)}</Text>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 13, color: c.textSecondary }}>{unit}</Text>
              {delta !== null && Math.abs(delta) >= 0.05 ? (
                <Text style={{ fontFamily: FONTS.mono, fontSize: 13, fontWeight: '700', color: c.textPrimary, marginLeft: 4 }}>
                  {delta < 0 ? '↓' : '↑'}{Math.round(Math.abs(delta) * 10) / 10}
                </Text>
              ) : null}
            </View>
            <PressScale
              onPress={openLog}
              accessibilityRole="button"
              accessibilityLabel={t('weightTracker.logWeight')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 36, paddingHorizontal: 12, borderRadius: 11, backgroundColor: c.textPrimary }}
            >
              <Ionicons name="add" size={16} color={c.backgroundPrimary} />
              <Text style={{ fontWeight: '800', fontSize: 13, color: c.backgroundPrimary }}>{t('weightTracker.record')}</Text>
            </PressScale>
          </View>

          <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: CHART_H, marginTop: 10 }}>
            {chart ? (
              <Svg width={width} height={CHART_H}>
                <Line x1={0} x2={width} y1={chart.mid} y2={chart.mid} stroke={c.divider} strokeWidth={1} strokeDasharray="4 4" />
                <Path d={chart.area} fill={c.accent} opacity={0.35} />
                <Path d={chart.line} stroke={c.textPrimary} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                <Circle cx={chart.last[0]} cy={chart.last[1]} r={5.5} fill={c.accent} stroke={c.ink} strokeWidth={2} />
              </Svg>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 13, color: c.textSecondary, textAlign: 'center' }}>{t('train.weightNeedMore')}</Text>
              </View>
            )}
          </View>
          {chart && rangeChange !== null ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary }}>
                {new Date(points[0].t).toLocaleDateString(language, { month: 'numeric', day: 'numeric' })}
              </Text>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary }}>
                {t('train.rangeChange', { n: String(range), v: `${signed(rangeChange)} ${unit}` })}
              </Text>
            </View>
          ) : null}
        </>
      )}

      <Modal visible={logging} transparent animationType="slide" onRequestClose={() => setLogging(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setLogging(false)} />
          <View style={{ backgroundColor: c.backgroundPrimary, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36, gap: 14 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: c.textPrimary }}>{t('weightTracker.logWeight')}</Text>
            <TextField
              value={input}
              onChangeText={(v) => setInput(v.replace(/[^0-9.,]/g, '').slice(0, 6))}
              keyboardType="decimal-pad"
              autoFocus
              placeholder={t('weightTracker.weightPlaceholder')}
              right={<Text style={{ fontFamily: FONTS.mono, fontSize: 15, color: c.textSecondary, marginRight: 12 }}>{unit}</Text>}
            />
            <Button label={t('common.save')} onPress={save} loading={saving} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Card>
  );
}
