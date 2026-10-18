import { View, Alert } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';
import { Card, IconButton, Label, PressScale } from '@/components/ui/bxc';
import UserAvatar from '@/components/ui/UserAvatar';
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

/**
 * The profile "name card": photo with the status emoji on its corner, name and
 * bio, and the two codes side by side at the bottom.
 */
export default function UserProfileCard({ user, onEdit }: UserProfileCardProps) {
  const { t } = useTranslation();
  const c = useTheme();

  const displayName = user?.username ? `@${user.username}` : user?.name || t('settings.userName');
  const bonus = user?.bonusAiCalls ?? 0;

  return (
    <Card variant="hero" padding={16} style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <PressScale onPress={onEdit} accessibilityRole="button" accessibilityLabel={t('settings.editProfile' as any)} style={{ transform: [{ rotate: '-3deg' }] }}>
          <UserAvatar
            image={user?.avatarImage}
            name={user?.username || user?.name}
            status={user?.avatarEmoji}
            size={72}
            radius={22}
            background={c.accent}
            color={c.onAccent}
            ring={c.ink}
          />
          {!user?.avatarEmoji ? (
            // No status yet: a dashed "+" where the badge would be.
            <View style={{
              position: 'absolute', right: -7, bottom: -6, width: 28, height: 28, borderRadius: 14,
              backgroundColor: c.cardBackground, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.textSecondary,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="happy-outline" size={15} color={c.textSecondary} />
            </View>
          ) : null}
        </PressScale>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.6, color: c.textPrimary }}>{displayName}</Text>
          {user?.bio ? (
            <Text numberOfLines={2} style={{ fontSize: 14, lineHeight: 19, color: c.textSecondary, marginTop: 2 }}>{user.bio}</Text>
          ) : null}
          {user?.showGender && user?.gender ? (
            <Label style={{ fontSize: 10, marginTop: 4 }}>{t(`settings.genderOptions.${user.gender}` as any) || user.gender}</Label>
          ) : null}
        </View>
        <IconButton icon="pencil-outline" onPress={onEdit} accessibilityLabel={t('settings.editProfile' as any)} />
      </View>

      {user?.friendCode || user?.inviteCode ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, paddingTop: 14, borderTopWidth: 1.5, borderTopColor: c.divider }}>
          {user?.friendCode ? (
            <CodeTile
              label={t('settings.friendCode' as any)}
              value={user.friendCode}
              display={user.friendCode.length === 8 ? `${user.friendCode.slice(0, 4)} ${user.friendCode.slice(4)}` : user.friendCode}
              caption={t('settings.friendCodeShort' as any)}
              copiedLabel={t('settings.friendCodeCopied' as any)}
              description={t('settings.friendCodeDesc' as any)}
            />
          ) : null}
          {user?.inviteCode ? (
            <CodeTile
              accent
              label={t('settings.inviteCode' as any)}
              value={user.inviteCode}
              display={user.inviteCode}
              caption={bonus > 0
                ? (t('settings.bonusScansShort' as any) as string).replace('{n}', String(bonus))
                : t('settings.inviteCodeShort' as any)}
              copiedLabel={t('settings.inviteCodeCopied' as any)}
              description={t('settings.inviteCodeDesc' as any)}
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

/** Tap to copy; the (i) explains what the code is for. */
function CodeTile({ label, value, display, caption, copiedLabel, description, accent }: {
  label: string;
  value: string;
  display: string;
  caption: string;
  copiedLabel: string;
  description: string;
  accent?: boolean;
}) {
  const c = useTheme();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const copy = async () => {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  };

  const fg = accent ? c.onAccent : c.textPrimary;
  const sub = accent ? c.onAccent : c.textSecondary;
  return (
    <PressScale
      onPress={copy}
      onLongPress={() => Alert.alert(label, description)}
      accessibilityRole="button"
      accessibilityLabel={copied ? copiedLabel : `${label} ${value}`}
      accessibilityHint={description}
      accessibilityLiveRegion="polite"
      style={{
        flex: 1, padding: 12, borderRadius: 16, borderWidth: 2,
        borderColor: accent ? c.ink : c.borderPrimary,
        backgroundColor: accent ? c.accent : c.cardBackground,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Label color={sub}>{label}</Label>
        <PressScale
          onPress={() => Alert.alert(label, description)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={description}
        >
          <Ionicons name="information-circle-outline" size={16} color={sub} />
        </PressScale>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{ flexShrink: 1, fontFamily: FONTS.mono, fontWeight: '700', fontSize: 19, letterSpacing: accent ? 2.5 : 1, color: fg }}
        >
          {display}
        </Text>
        <Ionicons name={copied ? 'checkmark-circle' : 'copy-outline'} size={copied ? 17 : 15} color={fg} />
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontSize: 12, color: sub, marginTop: 4 }}>
        {copied ? copiedLabel : caption}
      </Text>
    </PressScale>
  );
}
