import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getZustandPersistStorage } from '@/lib/platformStorage';
import { useUIStore } from '@/stores/uiStore';

/** Types specs §7.1 (+ chaîne libre pour extensions). */
export type PushNotificationKind =
  | 'garde_change'
  | 'verification_thanks'
  | 'badge_unlocked'
  | 'reminder'
  | string;

export type PushInboxItem = {
  id: string;
  kind: PushNotificationKind;
  title: string;
  body: string;
  receivedAt: string;
  pharmacyId?: string;
  read: boolean;
};

type PushInboxState = {
  items: PushInboxItem[];
  addFromRemote: (payload: {
    kind: PushNotificationKind;
    title: string;
    body: string;
    pharmacyId?: string;
    id?: string;
  }) => void;
  removeItem: (id: string) => void;
  markAllRead: () => void;
  recomputeUnreadBadge: () => void;
};

const MAX_ITEMS = 200;

function applyUnreadCount(items: PushInboxItem[]): void {
  const n = items.filter((i) => !i.read).length;
  useUIStore.getState().setUnreadNotificationCount(n);
}

export const usePushInboxStore = create<PushInboxState>()(
  persist(
    (set, get) => ({
      items: [],

      addFromRemote: (payload) => {
        const id =
          payload.id ??
          `push-${String(Date.now())}-${String(Math.random()).slice(2, 9)}`;
        set((s) => {
          const next: PushInboxItem = {
            id,
            kind: payload.kind,
            title: payload.title,
            body: payload.body,
            receivedAt: new Date().toISOString(),
            pharmacyId: payload.pharmacyId,
            read: false,
          };
          const items = [next, ...s.items].slice(0, MAX_ITEMS);
          applyUnreadCount(items);
          return { items };
        });
      },

      removeItem: (id) => {
        set((s) => {
          const items = s.items.filter((i) => i.id !== id);
          applyUnreadCount(items);
          return { items };
        });
      },

      markAllRead: () => {
        set((s) => {
          const items = s.items.map((i) => ({ ...i, read: true }));
          applyUnreadCount(items);
          return { items };
        });
      },

      recomputeUnreadBadge: () => {
        applyUnreadCount(get().items);
      },
    }),
    {
      name: 'pharmacie-garde-push-inbox',
      storage: createJSONStorage(getZustandPersistStorage),
      partialize: (s) => ({ items: s.items }),
      onRehydrateStorage: () => {
        return () => {
          usePushInboxStore.getState().recomputeUnreadBadge();
        };
      },
    },
  ),
);
