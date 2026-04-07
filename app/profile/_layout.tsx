import { Stack } from 'expo-router';

export default function ProfileStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Retour',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="verifications"
        options={{ title: 'Mes vérifications' }}
      />
      <Stack.Screen name="about" options={{ title: 'À propos' }} />
      <Stack.Screen
        name="edit-account"
        options={{ title: 'Modifier mes informations' }}
      />
    </Stack>
  );
}
