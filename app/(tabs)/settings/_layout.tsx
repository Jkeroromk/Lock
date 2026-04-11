import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
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
        name="weight-tracker"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="about"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="export-data"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}

