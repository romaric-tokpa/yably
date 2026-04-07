import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { type Href, router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { track } from '@/lib/analytics';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import {
  usePushInboxStore,
  type PushNotificationKind,
} from '@/stores/pushInboxStore';
import { usePushToastStore } from '@/stores/pushToastStore';

let notificationHandlerInstalled = false;
let androidChannelEnsured = false;

function getExpoProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined
  );
}

async function ensureAndroidDefaultChannel(): Promise<void> {
  if (Platform.OS !== 'android' || androidChannelEnsured) return;
  androidChannelEnsured = true;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Par défaut',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0D7C5F',
  });
}

function installNotificationHandler(): void {
  if (notificationHandlerInstalled) return;
  notificationHandlerInstalled = true;
  /* Premier plan : pas de bannière système, toast applicatif (specs §7). */
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: false,
      shouldShowList: true,
    }),
  });
}

type ParsedData = {
  kind: PushNotificationKind;
  pharmacyId?: string;
};

/** Évite double navigation (listener + cold start). */
let lastHandledNotificationIdentifier: string | null = null;

function parseNotificationData(
  data: Record<string, unknown> | undefined,
): ParsedData {
  const rawType = data?.type;
  const kind: PushNotificationKind =
    typeof rawType === 'string' ? rawType : 'unknown';
  const pharmacyId =
    typeof data?.pharmacy_id === 'string' ? data.pharmacy_id : undefined;
  return { kind, pharmacyId };
}

function navigateFromNotificationData(data: ParsedData): void {
  if (data.pharmacyId !== undefined && data.pharmacyId.length > 0) {
    router.push(`/pharmacy/${data.pharmacyId}` as Href);
    return;
  }
  if (data.kind === 'garde_change' || data.kind === 'reminder') {
    router.push('/(tabs)' as Href);
    return;
  }
  router.push('/(tabs)/notifications' as Href);
}

function handleNotificationResponse(
  response: Notifications.NotificationResponse | null,
): void {
  if (response === null) return;
  const nid = response.notification.request.identifier;
  if (nid !== '' && lastHandledNotificationIdentifier === nid) {
    return;
  }
  if (nid !== '') {
    lastHandledNotificationIdentifier = nid;
  }
  const content = response.notification.request.content;
  const data = parseNotificationData(
    content.data as Record<string, unknown> | undefined,
  );
  track('notification_tapped', { type: data.kind });
  navigateFromNotificationData(data);
}

/**
 * Configure expo-notifications, permission, token Expo → Supabase, inbox & navigation (specs §7).
 */
export function useNotifications(): void {
  const userId = useAuthStore((s) => s.userId);
  const profile = useAuthStore((s) => s.profile);
  const saveTokenInFlight = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return undefined;
    }

    void ensureAndroidDefaultChannel();
    installNotificationHandler();

    let isMounted = true;

    const registerListeners = (): (() => void) => {
      const receivedSub = Notifications.addNotificationReceivedListener(
        (event) => {
          const c = event.request.content;
          const data = parseNotificationData(
            c.data as Record<string, unknown> | undefined,
          );
          track('notification_received', { type: data.kind });
          usePushInboxStore.getState().addFromRemote({
            kind: data.kind,
            title: c.title ?? 'Notification',
            body: c.body ?? '',
            pharmacyId: data.pharmacyId,
          });
          usePushToastStore.getState().show({
            title: c.title ?? 'Notification',
            body: c.body ?? '',
          });
        },
      );

      const responseSub =
        Notifications.addNotificationResponseReceivedListener((response) => {
          handleNotificationResponse(response);
        });

      void Notifications.getLastNotificationResponseAsync().then((last) => {
        if (!isMounted || last === null) return;
        handleNotificationResponse(last);
      });

      return () => {
        receivedSub.remove();
        responseSub.remove();
      };
    };

    const removeListeners = registerListeners();

    const run = async (): Promise<void> => {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted' || !isMounted) {
        return;
      }

      try {
        const projectId = getExpoProjectId();
        if (projectId === undefined) {
          return;
        }
        const tokenResult = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        const expoToken = tokenResult.data;
        const uid = useAuthStore.getState().userId;
        const prof = useAuthStore.getState().profile;
        if (
          uid === null ||
          prof === null ||
          prof.notification_enabled !== true ||
          saveTokenInFlight.current
        ) {
          return;
        }
        if (prof.push_token === expoToken) {
          return;
        }
        saveTokenInFlight.current = true;
        const { error } = await supabase
          .from('profiles')
          .update({
            push_token: expoToken,
            updated_at: new Date().toISOString(),
          })
          .eq('id', uid);
        saveTokenInFlight.current = false;
        if (error !== null) {
          logger.error('save push_token', error);
          return;
        }
        await useAuthStore.getState().fetchProfile();
      } catch (e) {
        saveTokenInFlight.current = false;
        logger.error('push registration', e);
      }
    };

    void run();

    return () => {
      isMounted = false;
      removeListeners();
    };
  }, []);

  /* Re-synchroniser le token quand la session / les préférences changent. */
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const sync = async (): Promise<void> => {
      if (userId === null || profile === null) {
        return;
      }
      if (profile.notification_enabled !== true) {
        return;
      }
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      try {
        const projectId = getExpoProjectId();
        if (projectId === undefined) {
          return;
        }
        const tokenResult = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        const expoToken = tokenResult.data;
        if (profile.push_token === expoToken) {
          return;
        }
        const { error } = await supabase
          .from('profiles')
          .update({
            push_token: expoToken,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        if (error !== null) {
          logger.error('save push_token (sync)', error);
          return;
        }
        await useAuthStore.getState().fetchProfile();
      } catch (e) {
        logger.error('push sync', e);
      }
    };

    void sync();
  }, [userId, profile?.notification_enabled, profile?.push_token, profile?.id]);
}
