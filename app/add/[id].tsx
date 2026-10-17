/**
 * lock://add/12345678 — someone's Friend ID: opens "Add friend" pre-filled.
 * Sending the request still needs the other side to accept.
 */
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';

export default function AddFriendDeepLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const clean = (id ?? '').replace(/\D/g, '');
    if (isSignedIn && /^\d{8}$/.test(clean)) {
      router.replace({ pathname: '/(tabs)/dashboard', params: { addFriend: clean } });
    } else {
      router.replace(isSignedIn ? '/(tabs)/dashboard' : '/(auth)/login');
    }
  }, [id, isSignedIn]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
