import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { useStore } from '@/store/useStore';
import { getPrivacyContent } from '@/i18n/legal';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { t } = useTranslation();
  const { language } = useStore();
  const content = getPrivacyContent(language);

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
          {t('settings.privacyPolicy')}
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
          {content.intro}
        </Text>

        {content.sections.map((section, index) => (
          <View key={index} style={{ marginBottom: DIMENSIONS.SPACING * 1.5 }}>
            <Text style={{
              fontSize: TYPOGRAPHY.bodyM,
              fontWeight: '900',
              color: colors.textPrimary,
              marginBottom: DIMENSIONS.SPACING * 0.5,
            }}>
              {index + 1}. {section.title}
            </Text>
            <Text style={{
              fontSize: TYPOGRAPHY.bodyS,
              color: colors.textSecondary,
              lineHeight: TYPOGRAPHY.bodyS * 1.7,
            }}>
              {section.body}
            </Text>
          </View>
        ))}

        <Text style={{
          fontSize: TYPOGRAPHY.bodyXS,
          color: colors.textSecondary,
          opacity: 0.6,
          marginTop: DIMENSIONS.SPACING,
          textAlign: 'center',
        }}>
          {content.lastUpdated}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
