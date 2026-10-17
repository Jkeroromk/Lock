/**
 * lock://invite/ABC123 — someone's invite code. It waits in the store until the
 * onboarding invite step, which comes pre-filled. It never adds a friend.
 */
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useStore } from '@/store/useStore';

export default function InviteDeepLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const clean = (code ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase();
    if (/^[A-Z0-9]{6}$/.test(clean)) useStore.getState().setPendingInviteCode(clean);
    router.replace(isSignedIn ? '/' : '/(auth)/login');
  }, [code, isSignedIn]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
