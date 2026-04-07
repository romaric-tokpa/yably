import Constants from 'expo-constants';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAppTheme } from '@/components/common/appThemeContext';
import { spacing } from '@/lib/constants';

function AboutScreenInner() {
  const { theme: t } = useAppTheme();
  const version =
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    '—';

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: t.bg }}
      edges={['left', 'right', 'bottom']}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.screenHorizontal,
          paddingTop: 16,
          paddingBottom: 32,
        }}
      >
        <Text className="text-xl font-extrabold" style={{ color: t.text }}>
          Pharmacies de garde
        </Text>
        <Text className="mt-1 text-[14px] leading-6" style={{ color: t.textSoft }}>
          Abidjan — consultation des gardes et vérification communautaire.
        </Text>

        <View
          className="mt-6 rounded-[20px] border p-4"
          style={{ borderColor: t.border, backgroundColor: t.surface }}
        >
          <Text className="text-[14px] font-semibold" style={{ color: t.text }}>
            Version
          </Text>
          <Text className="mt-1 text-[14px]" style={{ color: t.textSoft }}>
            {version}
          </Text>
        </View>

        <Text className="mt-6 text-[14px] leading-6" style={{ color: t.textSoft }}>
          Les horaires et pharmacies de garde sont fournis à titre indicatif.
          En cas d’urgence, contactez les services de secours ou rendez-vous
          directement à l’établissement le plus adapté.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function AboutScreen() {
  return (
    <ScreenErrorBoundary>
      <AboutScreenInner />
    </ScreenErrorBoundary>
  );
}
