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
import { CheckCircle, XCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAppTheme } from '@/components/common/appThemeContext';
import { fonts } from '@/lib/fonts';
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
          <Text className="text-center text-[15px]" style={{ color: t.danger, fontFamily: fonts.outfitMedium }}>
            {displayError}
          </Text>
          <Pressable
            className="mt-4 rounded-[14px] px-6 py-3"
            style={{ backgroundColor: t.primary }}
            onPress={() => void query.refetch()}
          >
            <Text className="text-[14px] font-bold text-white" style={{ fontFamily: fonts.outfitBold }}>
              Réessayer
            </Text>
          </Pressable>
        </View>
      ) : query.data !== undefined && query.data.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: t.surfaceAlt }}>
            <CheckCircle size={32} color={t.textMuted} strokeWidth={1.5} />
          </View>
          <Text className="text-center text-[15px] leading-6" style={{ color: t.textSoft, fontFamily: fonts.outfitRegular }}>
            Aucune vérification pour le moment.
          </Text>
          <Text className="mt-2 text-center text-[13px] leading-5" style={{ color: t.textMuted, fontFamily: fonts.outfitRegular }}>
            Confirmez l'ouverture ou la fermeture d'une pharmacie depuis sa fiche pour gagner des points.
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{
            paddingHorizontal: spacing.screenHorizontal,
            paddingVertical: 16,
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
            const isOpen = item.status === 'open';
            const statusLabel = isOpen ? 'Confirmé ouvert' : 'Signalé fermé';
            const statusColor = isOpen ? t.success : t.danger;
            const bgStatus = isOpen ? 'rgba(46,234,173,0.1)' : 'rgba(255,75,75,0.1)';

            return (
              <View
                className="mb-3 flex-row items-center gap-4 rounded-[20px] border p-4"
                style={{
                  borderColor: t.border,
                  backgroundColor: t.surface,
                }}
              >
                <View
                  className="h-11 w-11 items-center justify-center rounded-full"
                  style={{ backgroundColor: bgStatus }}
                >
                  {isOpen ? (
                    <CheckCircle size={22} color={statusColor} strokeWidth={2.5} />
                  ) : (
                    <XCircle size={22} color={statusColor} strokeWidth={2.5} />
                  )}
                </View>
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-[16px] font-bold"
                    style={{ color: t.text, fontFamily: fonts.outfitBold }}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                  <View className="mt-1 flex-row items-center gap-2">
                    <Text
                      className="text-[13px] font-semibold"
                      style={{ color: statusColor, fontFamily: fonts.outfitSemiBold }}
                    >
                      {statusLabel}
                    </Text>
                    <View className="h-1 w-1 rounded-full" style={{ backgroundColor: t.textMuted }} />
                    <Text
                      className="text-[12px]"
                      style={{ color: t.textSoft, fontFamily: fonts.outfitMedium }}
                    >
                      {formatVerificationRelative(item.created_at)}
                    </Text>
                  </View>
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
