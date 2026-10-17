import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { fetchProfile } from '@/services/profile';
import { useStore } from '@/store/useStore';

/**
 * Re-reads bonus scans, invite code and Friend ID whenever the screen comes
 * into focus, so an inviter sees the +5 from a friend joining without relaunching.
 */
export function useRefreshRewards() {
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchProfile()
        .then((p) => {
          const me = useStore.getState().user;
          if (cancelled || !me || me.id !== p.id) return;
          const bonus = p.bonusAiCalls ?? 0;
          const inviteCode = p.inviteCode ?? me.inviteCode;
          const friendCode = p.friendCode ?? me.friendCode;
          if (bonus !== (me.bonusAiCalls ?? 0) || inviteCode !== me.inviteCode || friendCode !== me.friendCode) {
            useStore.getState().setUser({ ...me, bonusAiCalls: bonus, inviteCode, friendCode });
          }
        })
        .catch(() => {});
      return () => { cancelled = true; };
    }, []),
  );
}
