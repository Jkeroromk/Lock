import { View, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useTabBarInset } from '@/hooks/useTabBarInset';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { useStore } from '@/store/useStore';
import { getPrivacyContent, getTermsContent } from '@/i18n/legal';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useShallow } from 'zustand/react/shallow';
import { SUPPORT_EMAIL, SITE } from '@/constants/safety';

const EMAIL_RE = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

/** Body text with every email address tappable (opens Mail). */
function withLinks(body: string, color: string) {
  return body.split(EMAIL_RE).map((part, i) =>
    i % 2 === 1 ? (
      <Text key={i} accessibilityRole="link" onPress={() => Linking.openURL(`mailto:${part}`)} style={{ color, fontWeight: '800', textDecorationLine: 'underline' }}>
        {part}
      </Text>
    ) : part,
  );
}

/** Privacy policy or terms of service page. Shared by Settings and the pre-login /legal route. */
export default function LegalDocument({ kind }: { kind: 'privacy' | 'terms' }) {
  const tabInset = useTabBarInset();
  const router = useRouter();
  const colors = useTheme();
  const { t } = useTranslation();
  const { language } = useStore(useShallow((st) => ({ language: st.language })));
  const content = kind === 'privacy' ? getPrivacyContent(language) : getTermsContent(language);

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
          {kind === 'privacy' ? t('settings.privacyPolicy') : t('settings.termsOfService')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingBottom: tabInset }}
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

        {/* How to reach us, up front (App Review 5.1.1): email, the support page, the policy online. */}
        <View style={{ borderWidth: 2, borderColor: colors.borderPrimary, borderRadius: 14, padding: 14, marginBottom: DIMENSIONS.SPACING * 1.5, gap: 10 }}>
          <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>{t('legalContact.title')}</Text>
          <Text style={{ fontSize: TYPOGRAPHY.bodyS, color: colors.textSecondary, lineHeight: TYPOGRAPHY.bodyS * 1.6 }}>{t('legalContact.body')}</Text>
          {[
            { icon: 'mail-outline' as const, label: SUPPORT_EMAIL, url: `mailto:${SUPPORT_EMAIL}` },
            { icon: 'help-buoy-outline' as const, label: t('legalContact.support'), url: `${SITE}/support` },
            { icon: 'globe-outline' as const, label: t('legalContact.online'), url: `${SITE}/${kind}` },
          ].map((row) => (
            <TouchableOpacity
              key={row.url}
              accessibilityRole="link"
              onPress={() => Linking.openURL(row.url)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 }}
            >
              <Ionicons name={row.icon} size={20} color={colors.textPrimary} />
              <Text style={{ flex: 1, fontSize: TYPOGRAPHY.bodyS, fontWeight: '800', color: colors.textPrimary, textDecorationLine: 'underline' }}>{row.label}</Text>
              <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

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
              {withLinks(section.body, colors.textPrimary)}
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
