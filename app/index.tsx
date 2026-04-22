import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '@/store/useStore';
import { fetchProfile, updateProfile } from '@/services/api';
import LoadingScreen from '@/components/auth/LoadingScreen';

export default function Index() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const { user, setUser } = useStore();
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      fetchProfile()
        .then(async (profile) => {
          let completedOnboarding = profile.hasCompletedOnboarding;
          if (!completedOnboarding) {
            const localFlag = await AsyncStorage.getItem(`lock_onboarding_done_${profile.id}`).catch(() => null);
            if (localFlag === 'true') {
              completedOnboarding = true;
              updateProfile({ hasCompletedOnboarding: true }).catch(() => {});
            }
          }
          setUser({
            id: profile.id,
            name: profile.name || 'User',
            email: profile.email || '',
            username: profile.username ?? undefined,
            bio: profile.bio ?? undefined,
            avatarEmoji: profile.avatarEmoji ?? undefined,
            avatarImage: profile.avatarImage ?? undefined,
            showGender: profile.showGender ?? false,
            height: profile.height ?? undefined,
            age: profile.age ?? undefined,
            weight: profile.weight ?? undefined,
            gender: profile.gender as any,
            goal: profile.goal as any,
            exerciseFrequency: profile.exerciseFrequency as any,
            expectedTimeframe: profile.expectedTimeframe as any,
            hasCompletedOnboarding: completedOnboarding,
            plan: (profile.plan ?? 'FREE') as any,
          });
        })
        .catch(async () => {
          // fetch failed — check local flag using Clerk userId
          if (userId) {
            const localFlag = await AsyncStorage.getItem(`lock_onboarding_done_${userId}`).catch(() => null);
            if (localFlag === 'true' && !user?.hasCompletedOnboarding) {
              setUser({ ...(user as any), hasCompletedOnboarding: true });
            }
          }
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
