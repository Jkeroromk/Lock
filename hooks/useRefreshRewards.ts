import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { fetchProfile } from '@/services/profile';
import { useStore } from '@/store/useStore';

/**
 * Re-reads the reward fields (bonus scans, invite code) whenever the screen comes
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
          const code = p.inviteCode ?? me.inviteCode;
          if (bonus !== (me.bonusAiCalls ?? 0) || code !== me.inviteCode) {
            useStore.getState().setUser({ ...me, bonusAiCalls: bonus, inviteCode: code });
          }
        })
        .catch(() => {});
      return () => { cancelled = true; };
    }, []),
  );
}
