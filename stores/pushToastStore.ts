import { create } from 'zustand';

type PushToastPayload = {
  title: string;
  body: string;
};

type PushToastState = {
  toast: PushToastPayload | null;
  show: (t: PushToastPayload) => void;
  hide: () => void;
};

export const usePushToastStore = create<PushToastState>((set) => ({
  toast: null,
  show: (t) => set({ toast: t }),
  hide: () => set({ toast: null }),
}));
