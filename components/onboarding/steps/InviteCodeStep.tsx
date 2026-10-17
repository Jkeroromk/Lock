import { useState } from 'react';
import { View, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button, TextField } from '@/components/ui/bxc';
import StepHeader from '@/components/onboarding/StepHeader';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { FONTS } from '@/constants/fonts';
import { useStore } from '@/store/useStore';
import { redeemInviteCode, sendFriendRequest } from '@/services/api';

/**
 * Last, optional onboarding step: the invite code of whoever invited you. Both
 * get bonus scans. Becoming friends is a separate request the inviter accepts,
 * offered as a button after the code works. Skipping is just pressing Complete.
 */
export default function InviteCodeStep() {
  const { t } = useTranslation();
  const c = useTheme();
  const { user, setUser, pendingInviteCode, setPendingInviteCode } = useStore();
  // Pre-filled when the app was opened from someone's lock://invite/… link.
  const [code, setCode] = useState(pendingInviteCode ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; bonus: number; friendCode: string | null } | null>(null);
  const [friendState, setFriendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const addInviter = async () => {
    if (!done?.friendCode || friendState !== 'idle') return;
    setFriendState('sending');
    try {
      await sendFriendRequest(done.friendCode);
      setFriendState('sent');
    } catch (err: any) {
      // Already friends / already requested both mean there's nothing left to do.
      const msg: string = err?.response?.data?.error ?? '';
      setFriendState(/Already|already sent/i.test(msg) ? 'sent' : 'idle');
    }
  };

  const redeem = async () => {
    const value = code.trim().toUpperCase();
    if (value.length !== 6 || busy) return;
    Keyboard.dismiss();
    setBusy(true);
    setError(null);
    try {
      const res = await redeemInviteCode(value);
      setDone({ name: res.inviterName, bonus: res.bonus, friendCode: res.inviterFriendCode });
      setPendingInviteCode(null);
      if (user) setUser({ ...user, bonusAiCalls: (user.bonusAiCalls ?? 0) + res.bonus });
    } catch (err: any) {
      const codeErr: string = err?.response?.data?.error ?? '';
      const key = {
        INVALID_CODE: 'onboarding.inviteErrInvalid',
        SELF: 'onboarding.inviteErrSelf',
        NOT_NEW: 'onboarding.inviteErrNotNew',
        ALREADY_REDEEMED: 'onboarding.inviteErrUsed',
      }[codeErr] ?? 'onboarding.inviteErrGeneric';
      setError(t(key as any));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ width: '100%' }}>
      <StepHeader titleKey="onboarding.inviteTitle" descriptionKey="onboarding.inviteDescription" />

      {done ? (
        <View style={{ gap: 12 }}>
          <View
            accessibilityLiveRegion="polite"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, borderWidth: 2, borderColor: c.ink, backgroundColor: c.accent }}
          >
            <Ionicons name="gift" size={26} color={c.onAccent} />
            <Text style={{ flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '700', color: c.onAccent }}>
              {(t('onboarding.inviteDone' as any) as string).replace('{name}', done.name || '—').replace('{n}', String(done.bonus))}
            </Text>
          </View>
          {done.friendCode ? (
            friendState === 'sent' ? (
              <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44 }}>
                <Ionicons name="time-outline" size={17} color={c.textSecondary} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: c.textSecondary }}>{t('onboarding.inviteRequestSent' as any)}</Text>
              </View>
            ) : (
              <Button
                label={(t('onboarding.inviteAddFriend' as any) as string).replace('{name}', done.name || '—')}
                icon="person-add-outline"
                variant="outline"
                loading={friendState === 'sending'}
                onPress={addInviter}
              />
            )
          ) : null}
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <TextField
            accessibilityLabel={t('onboarding.inviteTitle' as any)}
            placeholder="ABC123"
            value={code}
            onChangeText={(v) => { setCode(v.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6)); setError(null); }}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={redeem}
            style={{ fontFamily: FONTS.mono, fontSize: 22, letterSpacing: 6, textAlign: 'center' }}
          />
          {error ? (
            <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 12, backgroundColor: 'rgba(214,69,51,0.12)' }}>
              <Ionicons name="alert-circle" size={17} color="#D64533" style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '600', color: '#D64533' }}>{error}</Text>
            </View>
          ) : null}
          <Button
            label={t('onboarding.inviteApply' as any)}
            icon="gift-outline"
            variant="solid"
            loading={busy}
            disabled={code.length !== 6}
            onPress={redeem}
          />
          <Text style={{ fontSize: 13, color: c.textSecondary, textAlign: 'center' }}>{t('onboarding.inviteSkip' as any)}</Text>
        </View>
      )}
    </View>
  );
}
