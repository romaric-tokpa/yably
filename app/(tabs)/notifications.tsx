import { useFocusEffect } from 'expo-router';
import { Award, Bell, Gift, Moon, RefreshCw } from 'lucide-react-native';
import {
  useCallback,
  useMemo,
  useRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Animated,
  PanResponder,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAppTheme } from '@/components/common/appThemeContext';
import { spacing } from '@/lib/constants';
import { formatVerificationRelative } from '@/lib/format';
import {
  usePushInboxStore,
  type PushInboxItem,
  type PushNotificationKind,
} from '@/stores/pushInboxStore';

function iconForKind(kind: PushNotificationKind, color: string) {
  switch (kind) {
    case 'garde_change':
      return <RefreshCw size={22} color={color} strokeWidth={2} />;
    case 'verification_thanks':
      return <Gift size={22} color={color} strokeWidth={2} />;
    case 'badge_unlocked':
      return <Award size={22} color={color} strokeWidth={2} />;
    case 'reminder':
      return <Moon size={22} color={color} strokeWidth={2} />;
    default:
      return <Bell size={22} color={color} strokeWidth={2} />;
  }
}

function SwipeToDismissRow(props: {
  children: ReactNode;
  onDismiss: () => void;
}): ReactElement {
  const { children, onDismiss } = props;
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_e, g) => {
        if (g.dx < 0) translateX.setValue(g.dx);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dx < -72) {
          Animated.timing(translateX, {
            toValue: -400,
            duration: 180,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished) dismissRef.current();
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  return (
    <View {...panResponder.panHandlers}>
      <Animated.View style={{ transform: [{ translateX }] }}>{children}</Animated.View>
    </View>
  );
}

function NotificationsScreenInner(): ReactElement {
  const { theme: t } = useAppTheme();
  const items = usePushInboxStore((s) => s.items);
  const removeItem = usePushInboxStore((s) => s.removeItem);
  const markAllRead = usePushInboxStore((s) => s.markAllRead);

  useFocusEffect(
    useCallback(() => {
      markAllRead();
    }, [markAllRead]),
  );

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)),
    [items],
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: t.bg }} edges={['left', 'right']}>
      <View className="px-5 pb-2 pt-4">
        <Text className="text-[22px] font-extrabold" style={{ color: t.text }}>
          Notifications
        </Text>
        <Text className="mt-1 text-[14px]" style={{ color: t.textSoft }}>
          Historique des alertes reçues sur cet appareil
        </Text>
      </View>

      {sorted.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Bell size={48} color={t.textMuted} strokeWidth={1.5} />
          <Text className="mt-4 text-center text-[15px] leading-6" style={{ color: t.textSoft }}>
            Aucune notification pour le moment. Les alertes de garde et rappels apparaîtront ici.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.screenHorizontal,
            paddingBottom: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          {sorted.map((item: PushInboxItem) => (
            <SwipeToDismissRow key={item.id} onDismiss={() => removeItem(item.id)}>
              <View
                className="mb-3 flex-row gap-3 rounded-[20px] border p-4"
                style={{
                  borderColor: t.border,
                  backgroundColor: t.surface,
                }}
              >
                <View
                  className="h-11 w-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: t.primaryMuted }}
                >
                  {iconForKind(item.kind, t.primary)}
                </View>
                <View className="min-w-0 flex-1">
                  <View className="flex-row flex-wrap items-center justify-between gap-2">
                    <Text
                      className="flex-1 text-[16px] font-bold"
                      style={{ color: t.text }}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    {!item.read ? (
                      <View
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: t.primary }}
                      />
                    ) : null}
                  </View>
                  <Text className="mt-1 text-[14px] leading-5" style={{ color: t.textSoft }}>
                    {item.body}
                  </Text>
                  <Text className="mt-2 text-xs" style={{ color: t.textMuted }}>
                    {formatVerificationRelative(item.receivedAt)}
                  </Text>
                </View>
              </View>
            </SwipeToDismissRow>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

export default function NotificationsScreen(): ReactElement {
  return (
    <ScreenErrorBoundary>
      <NotificationsScreenInner />
    </ScreenErrorBoundary>
  );
}
