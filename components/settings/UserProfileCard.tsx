import { View, TouchableOpacity, Image } from 'react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { Card, IconButton, Label } from '@/components/ui/bxc';
import { useTheme } from '@/hooks/useTheme';


interface User {
  name?: string;
  email?: string;
  username?: string;
  bio?: string;
  avatarEmoji?: string;
  avatarImage?: string;
  gender?: string;
  showGender?: boolean;
  inviteCode?: string;
  friendCode?: string;
  bonusAiCalls?: number;
}

interface UserProfileCardProps {
  user: User | null;
  onEdit: () => void;
}

export default function UserProfileCard({ user, onEdit }: UserProfileCardProps) {
  const { t } = useTranslation();
  const colors = useTheme();

  const displayName = user?.username ? `@${user.username}` : user?.name || t('settings.userName');

  return (
    <Card variant="hero" padding={16} style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{
          width: 72, height: 72, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
          backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.ink, transform: [{ rotate: '-3deg' }],
        }}>
          {user?.avatarImage ? (
            <Image source={{ uri: user.avatarImage }} style={{ width: 72, height: 72 }} accessibilityIgnoresInvertColors />
          ) : user?.avatarEmoji ? (
            <Text style={{ fontSize: 34 }}>{user.avatarEmoji}</Text>
          ) : (
            <Text style={{ fontSize: 30, fontWeight: '800', color: colors.onAccent }}>{(user?.name || '?').trim().charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.6, color: colors.textPrimary }}>{displayName}</Text>
          {user?.bio ? (
            <Text numberOfLines={2} style={{ fontSize: 14, lineHeight: 19, color: colors.textSecondary, marginTop: 2 }}>{user.bio}</Text>
          ) : null}
          {user?.showGender && user?.gender ? (
            <Label style={{ fontSize: 10, marginTop: 4 }}>{t(`settings.genderOptions.${user.gender}` as any) || user.gender}</Label>
          ) : null}
        </View>
        <IconButton icon="pencil-outline" onPress={onEdit} accessibilityLabel={t('settings.editProfile' as any)} />
      </View>

      {user?.friendCode ? (
        <CodeRow
          label={t('settings.friendCode' as any)}
          value={user.friendCode}
          copiedLabel={t('settings.friendCodeCopied' as any)}
          description={t('settings.friendCodeDesc' as any)}
          variant="plain"
        />
      ) : null}

      {user?.inviteCode ? (
        <CodeRow
          label={t('settings.inviteCode' as any)}
          value={user.inviteCode}
          copiedLabel={t('settings.inviteCodeCopied' as any)}
          description={t('settings.inviteCodeDesc' as any)}
          variant="accent"
        >
          {(user.bonusAiCalls ?? 0) > 0 ? (
            <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
              <Ionicons name="gift" size={15} color={colors.textPrimary} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                {(t('settings.bonusScansLeft' as any) as string).replace('{n}', String(user.bonusAiCalls))}
              </Text>
            </View>
          ) : null}
        </CodeRow>
      ) : null}
    </Card>
  );
}

/** A copyable code: Friend ID (plain, for adding friends) or invite code (yellow, for sign-ups). */
function CodeRow({ label, value, copiedLabel, description, variant, children }: {
  label: string;
  value: string;
  copiedLabel: string;
  description: string;
  variant: 'plain' | 'accent';
  children?: ReactNode;
}) {
  const colors = useTheme();
  // Copy → the icon turns into a checkmark for a moment instead of an alert.
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const copy = async () => {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  };

  const accent = variant === 'accent';
  const fg = accent ? colors.onAccent : colors.textPrimary;
  return (
    <View style={{ marginTop: 16, borderTopWidth: 1.5, borderTopColor: colors.divider, paddingTop: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Label>{label}</Label>
        <TouchableOpacity
          onPress={copy}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={copied ? copiedLabel : `${label} ${value}`}
          accessibilityLiveRegion="polite"
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 14,
            borderRadius: 13, borderWidth: 2, borderColor: colors.ink,
            backgroundColor: accent ? colors.accent : colors.cardBackground,
          }}
        >
          <Text style={{ fontFamily: FONTS.mono, fontWeight: '600', fontSize: 17, letterSpacing: accent ? 3 : 1.5, color: fg }}>{value}</Text>
          <Ionicons name={copied ? 'checkmark-circle' : 'copy-outline'} size={copied ? 18 : 16} color={fg} />
        </TouchableOpacity>
      </View>
      <Text style={{ fontSize: 13, lineHeight: 18, color: colors.textSecondary, marginTop: 8 }}>{description}</Text>
      {children}
    </View>
  );
}
