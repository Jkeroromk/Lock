import { Stack } from 'expo-router';
import TabFocusFade from '@/components/ui/TabFocusFade';
import TwoPane from '@/components/layout/TwoPane';
import SettingsMenu from '@/components/settings/SettingsMenu';
import { settingsSplit } from '@/components/settings/settingsSplit';
import { useDeviceLayout } from '@/hooks/useDeviceLayout';

export default function SettingsLayout() {
  const { kind } = useDeviceLayout();
  // Open iPhone Duo side by side: the list stays on the left page and every
  // Settings page opens on the right page (each was a stretched phone page).
  if (settingsSplit(kind)) {
    return (
      <TabFocusFade>
        <TwoPane left={<SettingsMenu />} right={<SettingsStack />} />
      </TabFocusFade>
    );
  }
  return (
    <TabFocusFade>
      <SettingsStack />
    </TabFocusFade>
  );
}

function SettingsStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="account-security"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="pricing"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="privacy-policy"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="terms-of-service"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="contacts"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="blocked-users"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="weight-tracker"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="about"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="preferences"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="goals"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="friends"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="account"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="app-icon"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="export-data"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}

