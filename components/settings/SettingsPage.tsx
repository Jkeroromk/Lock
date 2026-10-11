import { ReactNode } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { FONTS } from '@/constants/fonts';
import { Appear, PressScale, ScreenHeader } from '@/components/ui/bxc';

/** Shell for a Settings sub-page: back button, big title, scrolling body. */
export default function SettingsPage({ title, caption, children }: { title: string; caption?: string; children: ReactNode }) {
  const c = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: c.backgroundPrimary }}>
      <View style={{ paddingHorizontal: 12, paddingTop: 4 }}>
        <PressScale
          onPress={() => router.back()}
          scaleTo={0.88}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </PressScale>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={title} caption={caption} style={{ marginTop: 0 }} />
        <Appear>{children}</Appear>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Mono section label between groups of rows. */
export function SettingsSection({ label }: { label: string }) {
  const c = useTheme();
  return (
    <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary, textTransform: 'uppercase', marginTop: 14, marginBottom: 8, marginLeft: 4 }}>
      {label}
    </Text>
  );
}
