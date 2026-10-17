import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { FONTS } from '@/constants/fonts';
import { IconButton, Sticker } from '@/components/ui/bxc';
import { useRouter } from 'expo-router';

interface DateHeaderProps {
  language: string;
  streak?: number;
}

const LOCALES: Record<string, string> = { 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', 'ja-JP': 'ja-JP', 'ko-KR': 'ko-KR' };

/** "Lock in." title, today's date and the tilted streak sticker. */
export default function DateHeader({ language, streak = 0 }: DateHeaderProps) {
  const { t } = useTranslation();
  const c = useTheme();
  const locale = LOCALES[language] ?? 'en-US';
  const date = new Date().toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
  const isLight = c.backgroundPrimary !== c.ink;
  const router = useRouter();

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8, marginBottom: 16 }}>
      <View>
        <Text style={{ fontSize: 42, fontWeight: '800', letterSpacing: -1.8, lineHeight: 42, color: c.textPrimary }}>
          Lock in.
        </Text>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.textSecondary, marginTop: 8, textTransform: 'uppercase' }}>
          {date}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
      {streak > 0 ? (
        <Sticker background={isLight ? c.ink : c.accent}>
          <Ionicons name="flame" size={13} color={isLight ? c.accent : c.onAccent} />
          <Text style={{ fontFamily: FONTS.mono, fontWeight: '600', fontSize: 12, color: isLight ? c.paper : c.onAccent, textTransform: 'uppercase' }}>
            {t('today.streakDays', { n: String(streak) })}
          </Text>
        </Sticker>
      ) : null}
        <IconButton icon="calendar-outline" onPress={() => router.push('/calendar')} accessibilityLabel={t('today.openCalendar' as any)} />
      </View>
    </View>
  );
}
