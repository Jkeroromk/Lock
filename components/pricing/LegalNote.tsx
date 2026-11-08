import { Text } from '@/components/ui/Text';

/** Apple's subscription terms with tappable Terms of Service / Privacy Policy links. */
export function LegalNote({ colors, router, legalNote, t }: { colors: any; router: any; legalNote: string; t: (k: any) => any }) {
  const termsLabel: string = t('settings.termsOfService');
  const privacyLabel: string = t('settings.privacyPolicy');
  const parts = legalNote.split(/(Terms of Service|Privacy Policy|服务条款|隐私政策|服務條款|隱私政策|利用規約|プライバシーポリシー|이용약관|개인정보처리방침)/);
  return (
    <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 18 }}>
      {parts.map((part, i) => {
        const isTerms = part === 'Terms of Service' || part === '服务条款' || part === '服務條款' || part === '利用規約' || part === '이용약관';
        const isPrivacy = part === 'Privacy Policy' || part === '隐私政策' || part === '隱私政策' || part === 'プライバシーポリシー' || part === '개인정보처리방침';
        if (isTerms) {
          return (
            <Text key={i} style={{ color: colors.textPrimary, fontWeight: '600', textDecorationLine: 'underline' }}
              onPress={() => router.push('/(tabs)/settings/terms-of-service')}>
              {part}
            </Text>
          );
        }
        if (isPrivacy) {
          return (
            <Text key={i} style={{ color: colors.textPrimary, fontWeight: '600', textDecorationLine: 'underline' }}
              onPress={() => router.push('/(tabs)/settings/privacy-policy')}>
              {part}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}
