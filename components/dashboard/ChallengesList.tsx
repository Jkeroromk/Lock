import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { FONTS } from '@/constants/fonts';
import { Bar, Card, RADIUS, STROKE } from '@/components/ui/bxc';

interface Challenge {
  id: string;
  title: string;
  description: string;
  progress: number;
  total: number;
  participants: number;
}

interface ChallengesListProps {
  challenges: Challenge[];
}

export default function ChallengesList({ challenges }: ChallengesListProps) {
  const { t } = useTranslation();
  const c = useTheme();

  if (challenges.length === 0) {
    return (
      <View style={{ borderRadius: RADIUS.card, borderWidth: STROKE.card, borderColor: c.borderPrimary, backgroundColor: c.cardBackground, padding: 24, alignItems: 'center', marginBottom: 14 }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: c.accent, borderWidth: 2, borderColor: c.ink, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] }}>
          <Ionicons name="flag-outline" size={30} color={c.onAccent} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: '800', color: c.textPrimary, marginTop: 16, textAlign: 'center' }}>{t('challenge.noChallenges' as any)}</Text>
        <Text style={{ fontSize: 14, lineHeight: 20, color: c.textSecondary, textAlign: 'center', marginTop: 6 }}>{t('challenge.noChallengesHint' as any)}</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 12, marginBottom: 14 }}>
      {challenges.map((ch) => {
        const done = ch.total > 0 && ch.progress >= ch.total;
        return (
          <Card key={ch.id} variant={done ? 'hero' : 'default'} padding={16}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary, textTransform: 'uppercase' }}>
                {ch.participants} {t('dashboard.participants')}
              </Text>
              <Text style={{ fontFamily: FONTS.mono, fontWeight: '600', fontSize: 11, color: c.textPrimary, textTransform: 'uppercase' }}>
                {ch.progress} / {ch.total} {t('dashboard.days')}
              </Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.6, color: c.textPrimary, marginTop: 6 }}>{ch.title}</Text>
            {ch.description ? (
              <Text style={{ fontSize: 14, lineHeight: 20, color: c.textSecondary, marginTop: 4 }}>{ch.description}</Text>
            ) : null}
            <Bar progress={ch.total > 0 ? ch.progress / ch.total : 0} height={12} color={done ? c.accent : undefined} style={{ marginTop: 12 }} />
          </Card>
        );
      })}
    </View>
  );
}
