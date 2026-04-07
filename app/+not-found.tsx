import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenErrorBoundary } from '@/components/common/ErrorBoundary';
import { theme } from '@/lib/constants';
import { useUIStore } from '@/stores/uiStore';

function NotFoundScreenInner() {
  const nightMode = useUIStore((s) => s.nightMode);
  const t = nightMode ? theme.night : theme.day;

  return (
    <>
      <Stack.Screen options={{ title: 'Page introuvable' }} />
      <View style={[styles.container, { backgroundColor: t.bg }]}>
        <Text style={[styles.title, { color: t.text }]}>Cette page n&apos;existe pas.</Text>

        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: t.primary }]}>Retour à l&apos;accueil</Text>
        </Link>
      </View>
    </>
  );
}

export default function NotFoundScreen() {
  return (
    <ScreenErrorBoundary>
      <NotFoundScreenInner />
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
