import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { fetchDietAnalysis, DietAnalysis } from '@/services/api';

export default function AiInsightsCard() {
  const colors = useTheme();
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
      setError(err?.response?.data?.error || err?.message || '分析失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{
      borderRadius: 24,
      padding: DIMENSIONS.SPACING * 1.2,
      marginBottom: DIMENSIONS.SPACING * 1.2,
      backgroundColor: colors.cardBackground,
      borderWidth: 2,
      borderColor: colors.borderPrimary,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING * 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{
            width: 32, height: 32, borderRadius: 10,
            backgroundColor: colors.cardBackgroundSecondary,
            borderWidth: 1, borderColor: colors.borderPrimary,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name="sparkles" size={16} color={colors.textPrimary} />
          </View>
          <Text style={{ fontSize: TYPOGRAPHY.title, fontWeight: '900', color: colors.textPrimary }}>
            AI 饮食分析
          </Text>
        </View>
        {data && (
          <TouchableOpacity onPress={handleAnalyze} disabled={loading}>
            <Ionicons name="refresh" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {!data && !loading && (
        <>
          <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '500', color: colors.textPrimary, opacity: 0.7, marginBottom: DIMENSIONS.SPACING * 1 }}>
            基于你的近7天饮食记录和身体目标，AI 将给出个性化建议
          </Text>
          <TouchableOpacity
            onPress={handleAnalyze}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              paddingVertical: DIMENSIONS.SPACING * 0.85, borderRadius: 14,
              backgroundColor: colors.textPrimary,
            }}
          >
            <Ionicons name="sparkles" size={16} color={colors.backgroundPrimary} />
            <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.backgroundPrimary }}>
              开始分析
            </Text>
          </TouchableOpacity>
        </>
      )}

      {loading && (
        <View style={{ alignItems: 'center', paddingVertical: DIMENSIONS.SPACING * 1.5 }}>
          <ActivityIndicator color={colors.textPrimary} />
          <Text style={{ fontSize: TYPOGRAPHY.bodyXS, fontWeight: '600', color: colors.textSecondary, marginTop: DIMENSIONS.SPACING * 0.6 }}>
            AI 分析中...
          </Text>
        </View>
      )}

      {error && (
        <Text style={{ fontSize: TYPOGRAPHY.bodyXS, color: '#EF4444', fontWeight: '600', textAlign: 'center' }}>
          {error}
        </Text>
      )}

      {data && !loading && (
        <View style={{ gap: DIMENSIONS.SPACING * 0.8 }}>
          {/* Score + summary */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: DIMENSIONS.SPACING * 0.9, backgroundColor: colors.cardBackgroundSecondary, borderRadius: 14, borderWidth: 1, borderColor: colors.borderPrimary }}>
            <View style={{ alignItems: 'center', minWidth: 44 }}>
              <Text style={{ fontSize: TYPOGRAPHY.numberL * 0.7, fontWeight: '900', color: colors.textPrimary, lineHeight: TYPOGRAPHY.numberL * 0.75 }}>
                {data.score}
              </Text>
              <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary }}>/ 10</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>近期状态</Text>
              <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '600', color: colors.textPrimary, lineHeight: TYPOGRAPHY.bodyS * 1.4 }}>
                {data.summary}
              </Text>
            </View>
          </View>

          {/* Diet suggestions */}
          <View>
            <Text style={{ fontSize: TYPOGRAPHY.bodyXXS, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: DIMENSIONS.SPACING * 0.5 }}>
              饮食建议
            </Text>
            <View style={{ gap: DIMENSIONS.SPACING * 0.45 }}>
              {data.suggestions.map((s, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.cardBackgroundSecondary, borderWidth: 1, borderColor: colors.borderPrimary, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: colors.textSecondary }}>{i + 1}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: TYPOGRAPHY.bodyS, fontWeight: '500', color: colors.textPrimary, lineHeight: TYPOGRAPHY.bodyS * 1.45 }}>
                    {s}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Exercise suggestion */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: DIMENSIONS.SPACING * 0.8, backgroundColor: colors.cardBackgroundSecondary, borderRadius: 12, borderWidth: 1, borderColor: colors.borderPrimary }}>
            <Ionicons name="barbell-outline" size={16} color={colors.textPrimary} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: TYPOGRAPHY.bodyS, fontWeight: '500', color: colors.textPrimary, lineHeight: TYPOGRAPHY.bodyS * 1.4 }}>
              {data.exercise}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
