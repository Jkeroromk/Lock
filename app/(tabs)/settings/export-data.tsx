import { View, Text, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { Share } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { fetchAllMealsForExport, fetchWeightRecords } from '@/services/api';

function buildMealsCsv(meals: Awaited<ReturnType<typeof fetchAllMealsForExport>>): string {
  const header = 'Date,Food Name,Calories (kcal),Protein (g),Carbs (g),Fat (g)';
  const rows = meals.map((m) => {
    const date = new Date(m.created_at).toLocaleDateString('en-CA'); // YYYY-MM-DD
    const name = `"${(m.food_name ?? '').replace(/"/g, '""')}"`;
    return `${date},${name},${m.calories},${m.protein},${m.carbs},${m.fat}`;
  });
  return [header, ...rows].join('\n');
}

function buildWeightCsv(records: Awaited<ReturnType<typeof fetchWeightRecords>>): string {
  const header = 'Date,Weight (kg),Note';
  const rows = records.map((r) => {
    const date = new Date(r.recordedAt).toLocaleDateString('en-CA');
    const note = `"${(r.note ?? '').replace(/"/g, '""')}"`;
    return `${date},${r.weight},${note}`;
  });
  return [header, ...rows].join('\n');
}

async function shareFile(filename: string, content: string, title: string) {
  const uri = (FileSystem.cacheDirectory ?? '') + filename;
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
  if (Platform.OS === 'ios') {
    await Share.share({ url: uri, title });
  } else {
    await Share.share({ message: content, title });
  }
}

export default function ExportDataScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { t } = useTranslation();
  const [exportingMeals, setExportingMeals] = useState(false);
  const [exportingWeight, setExportingWeight] = useState(false);

  const handleExportMeals = async () => {
    setExportingMeals(true);
    try {
      const meals = await fetchAllMealsForExport();
      if (!meals.length) {
        Alert.alert(t('common.error'), t('exportData.noMeals'));
        return;
      }
      const csv = buildMealsCsv(meals);
      await shareFile('lock_meals.csv', csv, t('exportData.shareTitle'));
      Alert.alert(t('exportData.success'), '');
    } catch {
      Alert.alert(t('common.error'), t('exportData.fetchFailed'));
    } finally {
      setExportingMeals(false);
    }
  };

  const handleExportWeight = async () => {
    setExportingWeight(true);
    try {
      const records = await fetchWeightRecords();
      if (!records.length) {
        Alert.alert(t('common.error'), t('exportData.noWeight'));
        return;
      }
      const csv = buildWeightCsv(records);
      await shareFile('lock_weight.csv', csv, t('exportData.shareTitle'));
      Alert.alert(t('exportData.success'), '');
    } catch {
      Alert.alert(t('common.error'), t('exportData.fetchFailed'));
    } finally {
      setExportingWeight(false);
    }
  };

  const cards: {
    icon: any;
    title: string;
    description: string;
    buttonLabel: string;
    loading: boolean;
    onPress: () => void;
  }[] = [
    {
      icon: 'restaurant-outline',
      title: t('exportData.meals'),
      description: t('exportData.mealsDescription'),
      buttonLabel: t('exportData.exportMeals'),
      loading: exportingMeals,
      onPress: handleExportMeals,
    },
    {
      icon: 'scale-outline',
      title: t('exportData.weight'),
      description: t('exportData.weightDescription'),
      buttonLabel: t('exportData.exportWeight'),
      loading: exportingWeight,
      onPress: handleExportWeight,
    },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: DIMENSIONS.CARD_PADDING,
        paddingVertical: DIMENSIONS.SPACING,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: DIMENSIONS.SPACING }}>
          <Ionicons name="chevron-back" size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: colors.textPrimary }}>
          {t('exportData.title')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{
          fontSize: TYPOGRAPHY.bodyS,
          color: colors.textSecondary,
          marginBottom: DIMENSIONS.SPACING * 1.5,
          lineHeight: TYPOGRAPHY.bodyS * 1.6,
        }}>
          {t('exportData.description')}
        </Text>

        {cards.map((card) => (
          <View
            key={card.title}
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 16,
              padding: DIMENSIONS.CARD_PADDING,
              borderWidth: 1,
              borderColor: colors.borderPrimary,
              marginBottom: DIMENSIONS.SPACING,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 0.6 }}>
              <Ionicons name={card.icon} size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
              <Text style={{
                fontSize: TYPOGRAPHY.bodyM,
                fontWeight: '900',
                color: colors.textPrimary,
                marginLeft: DIMENSIONS.SPACING * 0.6,
              }}>
                {card.title}
              </Text>
            </View>
            <Text style={{
              fontSize: TYPOGRAPHY.bodyXS,
              color: colors.textSecondary,
              marginBottom: DIMENSIONS.SPACING,
              lineHeight: TYPOGRAPHY.bodyXS * 1.6,
            }}>
              {card.description}
            </Text>
            <TouchableOpacity
              onPress={card.loading ? undefined : card.onPress}
              activeOpacity={0.7}
              style={{
                backgroundColor: colors.textPrimary,
                borderRadius: 12,
                paddingVertical: DIMENSIONS.SPACING * 0.7,
                alignItems: 'center',
                opacity: card.loading ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: colors.backgroundPrimary }}>
                {card.loading ? t('exportData.exporting') : card.buttonLabel}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
