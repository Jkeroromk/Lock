import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useStore } from '@/store/useStore';
import { fetchProfile } from '@/services/api';
import LoadingScreen from '@/components/auth/LoadingScreen';

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user, setUser } = useStore();
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      fetchProfile()
        .then((profile) => {
          setUser({
            id: profile.id,
            name: profile.name || 'User',
            email: profile.email || '',
            height: profile.height ?? undefined,
            age: profile.age ?? undefined,
            weight: profile.weight ?? undefined,
            gender: profile.gender as any,
            goal: profile.goal as any,
            exerciseFrequency: profile.exerciseFrequency as any,
            expectedTimeframe: profile.expectedTimeframe as any,
            hasCompletedOnboarding: profile.hasCompletedOnboarding,
          });
        })
        .catch(() => {
          // Keep any cached user state — don't overwrite with null on network errors
        })
        .finally(() => setProfileLoaded(true));
    } else {
      setUser(null);
      setProfileLoaded(true);
    }
  }, [isSignedIn, isLoaded]);

  if (!isLoaded || (isSignedIn && !profileLoaded)) {
    return <LoadingScreen />;
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!user?.hasCompletedOnboarding) {
    const { hasSelectedLanguage } = useStore.getState();
    if (!hasSelectedLanguage) return <Redirect href="/(auth)/language-selection" />;
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(tabs)/today" />;
}
