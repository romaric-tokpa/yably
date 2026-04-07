import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAppTheme } from '@/components/common/appThemeContext';
import { formatVerificationRelative } from '@/lib/format';
import { spacing } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { VerificationRowStatus } from '@/types/supabase';

type VerificationHistoryRow = {
  id: string;
  status: VerificationRowStatus;
  created_at: string;
  pharmacy_id: string;
  pharmacies: { name: string } | null;
};

function MyVerificationsScreenInner() {
  const { theme: t } = useAppTheme();
  const userId = useAuthStore((s) => s.userId);

  const query = useQuery({
    queryKey: ['my-verifications', userId],
    enabled: userId !== null,
    queryFn: async (): Promise<VerificationHistoryRow[]> => {
      if (userId === null) return [];
      const { data, error } = await supabase
        .from('verifications')
        .select('id, status, created_at, pharmacy_id, pharmacies(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error !== null) throw new Error(error.message);
      const rows = data as unknown as VerificationHistoryRow[] | null;
      return rows ?? [];
    },
  });

  const onRefresh = useCallback(() => {
    void query.refetch();
  }, [query]);

  const loading = query.isPending && query.data === undefined;
  const displayError =
    query.error instanceof Error
      ? query.error.message
      : query.error !== null
        ? 'Erreur de chargement'
        : null;

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: t.bg }}
      edges={['left', 'right', 'bottom']}
    >
      {loading ? (
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator color={t.primary} size="large" />
        </View>
      ) : displayError !== null ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-center" style={{ color: t.danger }}>
            {displayError}
          </Text>
          <Pressable
            className="mt-4 rounded-[14px] px-5 py-3"
            style={{ backgroundColor: t.primary }}
            onPress={() => void query.refetch()}
          >
            <Text className="font-bold text-white">Réessayer</Text>
          </Pressable>
        </View>
      ) : query.data !== undefined && query.data.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center" style={{ color: t.textSoft }}>
            Aucune vérification pour le moment. Confirmez l’ouverture d’une
            pharmacie depuis la fiche détail.
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{
            paddingHorizontal: spacing.screenHorizontal,
            paddingVertical: 12,
          }}
          data={query.data}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isPending}
              onRefresh={onRefresh}
              tintColor={t.primary}
            />
          }
          renderItem={({ item }) => {
            const name = item.pharmacies?.name ?? 'Pharmacie';
            const statusLabel =
              item.status === 'open' ? 'Ouvert' : 'Fermeture signalée';
            const statusColor = item.status === 'open' ? t.success : t.danger;
            return (
              <View
                className="mb-3 rounded-[20px] border p-4"
                style={{
                  borderColor: t.border,
                  backgroundColor: t.surface,
                }}
              >
                <Text className="text-base font-bold" style={{ color: t.text }}>
                  {name}
                </Text>
                <View className="mt-2 flex-row flex-wrap items-center gap-2">
                  <Text
                    className="text-[14px] font-semibold"
                    style={{ color: statusColor }}
                  >
                    {statusLabel}
                  </Text>
                  <Text className="text-[14px]" style={{ color: t.textMuted }}>
                    · {formatVerificationRelative(item.created_at)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

export default function MyVerificationsScreen() {
  return (
    <ScreenErrorBoundary>
      <MyVerificationsScreenInner />
    </ScreenErrorBoundary>
  );
}
