import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore, useStoreHydrated } from '@/store/useStore';
import { fetchProfile, updateProfile } from '@/services/api';
import LoadingScreen from '@/components/auth/LoadingScreen';
import { useTranslation } from '@/i18n';

/**
 * Startup router.
 *
 * Returning users go straight to Today using the profile cached on the device;
 * the fresh profile is fetched in the background and swapped in when it arrives.
 * Only first launches (no cached profile for this Clerk user) wait on the network.
 */
export default function Index() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const hydrated = useStoreHydrated();
  const { user, setUser } = useStore();
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const { t } = useTranslation();

  // If startup takes unusually long, tell the user instead of spinning silently.
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 12_000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded || !hydrated) return;

    if (!isSignedIn) {
      setUser(null);
      setProfileLoaded(true);
      return;
    }

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
        const current = useStore.getState().user;
        setUser({
          ...(current?.id === profile.id ? current : {}),
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
          streak: profile.streak ?? current?.streak ?? 0,
          inviteCode: profile.inviteCode ?? undefined,
          createdAt: profile.createdAt ?? current?.createdAt,
          bonusAiCalls: profile.bonusAiCalls ?? 0,
        } as any);
      })
      .catch(async () => {
        // Offline / server error: fall back to the local onboarding flag.
        if (userId) {
          const localFlag = await AsyncStorage.getItem(`lock_onboarding_done_${userId}`).catch(() => null);
          const current = useStore.getState().user;
          if (localFlag === 'true' && !current?.hasCompletedOnboarding) {
            setUser({ ...(current as any), id: current?.id ?? userId, hasCompletedOnboarding: true });
          }
        }
      })
      .finally(() => setProfileLoaded(true));
  }, [isSignedIn, isLoaded, hydrated]);

  if (!isLoaded || !hydrated) {
    return <LoadingScreen hint={slow ? t('common.slowLoading') : undefined} />;
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  // Cached profile for this same account → don't wait for the network.
  const cachedReady = !!user && user.id === userId && !!user.hasCompletedOnboarding;
  if (cachedReady) {
    return <Redirect href="/(tabs)/today" />;
  }

  if (!profileLoaded) {
    return <LoadingScreen hint={slow ? t('common.slowLoading') : undefined} />;
  }

  if (!user?.hasCompletedOnboarding) {
    const { hasSelectedLanguage } = useStore.getState();
    if (!hasSelectedLanguage) return <Redirect href="/(auth)/language-selection" />;
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(tabs)/today" />;
}
