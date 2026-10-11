import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { fetchDietAnalysis, DietAnalysis } from '@/services/api';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { RADIUS } from '@/components/ui/bxc';

/** Yellow "sticker" card: AI review of the last week, generated on demand. */
export default function AiInsightsCard() {
  const c = useTheme();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DietAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limited, setLimited] = useState(false);
  const router = useRouter();

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setLimited(false);
    try {
      setData(await fetchDietAnalysis());
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === 'DIET_ANALYSIS_LIMIT_REACHED') {
        setLimited(true);
        setError(t('aiInsights.dailyLimit' as any));
      } else {
        setError(t('aiInsights.analysisFailed' as any));
      }
    } finally {
      setLoading(false);
    }
  };

  const ink = c.onAccent;
  const body = { fontSize: 15, lineHeight: 21, color: ink } as const;

  return (
    <View style={{ backgroundColor: c.accent, borderRadius: RADIUS.card, borderWidth: 2, borderColor: c.ink, padding: 16, marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="sparkles" size={14} color={ink} />
          <Text style={{ fontFamily: FONTS.mono, fontWeight: '600', fontSize: 11, color: ink, textTransform: 'uppercase' }}>
            {t('aiInsights.title' as any)}
          </Text>
        </View>
        {data ? (
          <TouchableOpacity
            onPress={handleAnalyze}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t('aiInsights.startAnalysis' as any)}
            style={{ width: 44, height: 44, marginRight: -10, marginVertical: -12, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="refresh" size={17} color={ink} />
          </TouchableOpacity>
        ) : null}
      </View>

      {!data && !loading ? (
        <TouchableOpacity
          onPress={handleAnalyze}
          activeOpacity={0.8}
          accessibilityRole="button"
          style={{ marginTop: 12, minHeight: 48, borderRadius: 14, backgroundColor: c.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Ionicons name="sparkles" size={15} color={c.accent} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: c.paper }}>{t('aiInsights.startAnalysis' as any)}</Text>
        </TouchableOpacity>
      ) : null}

      {loading ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, minHeight: 48 }}>
          <ActivityIndicator color={ink} />
          <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: ink, textTransform: 'uppercase' }}>{t('aiInsights.analyzing' as any)}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
          <Ionicons name="alert-circle" size={16} color={ink} style={{ marginTop: 2 }} />
          <Text style={[body, { flex: 1 }]}>{error}</Text>
        </View>
      ) : null}
      {limited ? (
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/settings/pricing')}
          accessibilityRole="button"
          style={{ alignSelf: 'flex-start', marginTop: 10, minHeight: 44, paddingHorizontal: 16, borderRadius: 14, borderWidth: 2, borderColor: ink, justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', color: ink }}>{t('log.upgradeBtn' as any)}</Text>
        </TouchableOpacity>
      ) : null}

      {data && !loading ? (
        <View style={{ marginTop: 10, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 40, fontWeight: '800', letterSpacing: -1.5, lineHeight: 42, color: ink }}>{data.score}</Text>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: ink }}>/ 10</Text>
            </View>
            <Text style={[body, { flex: 1, fontWeight: '700', fontSize: 17, lineHeight: 22 }]}>{data.summary}</Text>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: FONTS.mono, fontWeight: '600', fontSize: 11, color: ink, textTransform: 'uppercase' }}>
              {t('aiInsights.dietSuggestions' as any)}
            </Text>
            {data.suggestions.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontFamily: FONTS.mono, fontWeight: '600', fontSize: 13, lineHeight: 21, color: ink, minWidth: 16 }}>{i + 1}.</Text>
                <Text style={[body, { flex: 1 }]}>{s}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 8, borderTopWidth: 1.5, borderTopColor: c.ink, paddingTop: 10 }}>
            <Ionicons name="barbell-outline" size={16} color={ink} style={{ marginTop: 2 }} />
            <Text style={[body, { flex: 1 }]}>{data.exercise}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
