import { type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';

export type OfflineBannerProps = {
  visible: boolean;
  /** Dernière synchro réussie du cache (affichée dans le libellé). */
  lastSyncDate: Date | null;
  onRetry: () => void;
};

/**
 * Bannière discrète mode hors-ligne (specs §6.3).
 */
export function OfflineBanner({
  visible,
  lastSyncDate,
  onRetry,
}: OfflineBannerProps): React.ReactElement | null {
  if (!visible) {
    return null;
  }

  const dateLabel =
    lastSyncDate !== null
      ? lastSyncDate.toLocaleDateString('fr-FR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  return (
    <View
      className="mt-3 flex-row items-center gap-2 rounded-[10px] border px-3 py-2.5"
      style={{
        borderColor: '#FDBA74',
        backgroundColor: '#FFF7ED',
      }}
    >
      <View className="min-w-0 flex-1">
        <Text className="text-[12px] font-semibold leading-4" style={{ color: '#9A3412' }}>
          Mode hors-ligne — données du {dateLabel}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Réessayer la synchronisation"
        hitSlop={8}
        onPress={onRetry}
        className="rounded-lg px-2 py-1"
        style={{ backgroundColor: '#FFEDD5' }}
      >
        <Text className="text-[12px] font-bold" style={{ color: '#C2410C' }}>
          Réessayer
        </Text>
      </Pressable>
    </View>
  );
}
