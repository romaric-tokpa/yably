import { useEffect, type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/components/common/appThemeContext';
import { spacing } from '@/lib/constants';
import { usePushToastStore } from '@/stores/pushToastStore';

const TOAST_MS = 4500;

/**
 * Toast in-app pour notifications reçues au premier plan (specs §7).
 */
export function PushToastHost(): React.ReactElement | null {
  const { theme: t } = useAppTheme();
  const insets = useSafeAreaInsets();
  const toast = usePushToastStore((s) => s.toast);
  const hide = usePushToastStore((s) => s.hide);

  useEffect(() => {
    if (toast === null) return undefined;
    const id = setTimeout(() => hide(), TOAST_MS);
    return () => clearTimeout(id);
  }, [toast, hide]);

  if (toast === null) {
    return null;
  }

  return (
    <View
      className="absolute left-0 right-0 z-50 px-4"
      style={{ top: insets.top + 8 }}
      pointerEvents="box-none"
    >
      <Pressable
        accessibilityRole="alert"
        onPress={() => hide()}
        className="rounded-2xl border px-4 py-3 shadow-md"
        style={{
          borderColor: t.border,
          backgroundColor: t.surface,
          maxWidth: '100%',
          marginHorizontal: spacing.screenHorizontal - 16,
        }}
      >
        <Text className="text-[15px] font-bold" style={{ color: t.text }} numberOfLines={2}>
          {toast.title}
        </Text>
        <Text className="mt-1 text-[14px] leading-5" style={{ color: t.textSoft }} numberOfLines={4}>
          {toast.body}
        </Text>
        <Text className="mt-2 text-center text-xs" style={{ color: t.textMuted }}>
          Toucher pour fermer
        </Text>
      </Pressable>
    </View>
  );
}
