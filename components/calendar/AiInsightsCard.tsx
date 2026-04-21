import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { fetchDietAnalysis, DietAnalysis } from '@/services/api';
import { useTranslation } from '@/i18n';

export default function AiInsightsCard() {
  const colors = useTheme();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DietAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDietAnalysis();
      setData(result);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || t('aiInsights.analysisFailed' as any));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{
      borderRadius: 16,
      padding: DIMENSIONS.SPACING * 0.9,
      marginBottom: DIMENSIONS.SPACING * 1.2,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING * 0.6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="sparkles" size={14} color={colors.textPrimary} />
          <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '800', color: colors.textPrimary }}>
            {t('aiInsights.title' as any)}
          </Text>
        </View>
        {data && (
          <TouchableOpacity onPress={handleAnalyze} disabled={loading}>
            <Ionicons name="refresh" size={15} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {!data && !loading && (
        <TouchableOpacity
          onPress={handleAnalyze}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            paddingVertical: DIMENSIONS.SPACING * 0.6, borderRadius: 10,
            backgroundColor: colors.textPrimary,
          }}
        >
          <Ionicons name="sparkles" size={13} color={colors.backgroundPrimary} />
          <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: colors.backgroundPrimary }}>
            {t('aiInsights.startAnalysis' as any)}
          </Text>
        </TouchableOpacity>
      )}

      {loading && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: DIMENSIONS.SPACING * 0.6 }}>
          <ActivityIndicator size="small" color={colors.textPrimary} />
          <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '600', color: colors.textSecondary }}>
            {t('aiInsights.analyzing' as any)}
          </Text>
        </View>
      )}

      {error && (
        <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, color: '#EF4444', fontWeight: '600', textAlign: 'center' }}>
          {error}
        </Text>
      )}

      {data && !loading && (
        <View style={{ gap: DIMENSIONS.SPACING * 0.55 }}>
          {/* Score + summary */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: DIMENSIONS.SPACING * 0.65, backgroundColor: colors.cardBackgroundSecondary, borderRadius: 10, borderWidth: 1, borderColor: colors.borderPrimary }}>
            <View style={{ alignItems: 'center', minWidth: 36 }}>
              <Text style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: colors.textPrimary, lineHeight: TYPOGRAPHY.bodyL * 1.1 }}>
                {data.score}
              </Text>
              <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary }}>/ 10</Text>
            </View>
            <Text style={{ flex: 1, fontSize: TYPOGRAPHY.bodyXS, fontWeight: '500', color: colors.textPrimary, lineHeight: TYPOGRAPHY.bodyXS * 1.4 }}>
              {data.summary}
            </Text>
          </View>

          {/* Suggestions */}
          <View style={{ gap: DIMENSIONS.SPACING * 0.3 }}>
            <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {t('aiInsights.dietSuggestions' as any)}
            </Text>
            {data.suggestions.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '900', color: colors.textSecondary, marginTop: 2, minWidth: 14 }}>{i + 1}.</Text>
                <Text style={{ flex: 1, fontSize: TYPOGRAPHY.bodyXS, fontWeight: '500', color: colors.textPrimary, lineHeight: TYPOGRAPHY.bodyXS * 1.4 }}>
                  {s}
                </Text>
              </View>
            ))}
          </View>

          {/* Exercise */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, padding: DIMENSIONS.SPACING * 0.6, backgroundColor: colors.cardBackgroundSecondary, borderRadius: 10, borderWidth: 1, borderColor: colors.borderPrimary }}>
            <Ionicons name="barbell-outline" size={13} color={colors.textPrimary} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: TYPOGRAPHY.bodyXS, fontWeight: '500', color: colors.textPrimary, lineHeight: TYPOGRAPHY.bodyXS * 1.4 }}>
              {data.exercise}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
