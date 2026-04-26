import { create } from 'zustand';

import {
  registrationEmailInvalidMessage,
  validateRegistrationEmail,
} from '@/lib/auth-email';
import {
  buildDisplayName,
  mapAuthPasswordErrorToUserMessage,
  validatePersonName,
} from '@/lib/auth-password';
import {
  type RegistrationMeta,
  registrationMetaFromUserMetadata,
} from '@/lib/auth-registration-meta';
import { isStaleStoredSessionAuthMessage } from '@/lib/auth-session-recovery';
import { logger } from '@/lib/logger';
import {
  CI_INTERNATIONAL_PREFIX,
  parseCiPhoneToE164,
} from '@/lib/phoneIvoryCoast';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import type { Session } from '@supabase/supabase-js';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type AccountUpdatePayload = {
  firstName: string;
  lastName: string;
  email: string;
  nationalDigits: string;
};

export type AuthStoreState = {
  userId: string | null;
  sessionLoading: boolean;
  /** Métadonnées inscription (prénom, nom, e-mail) — complètent la ligne `profiles`. */
  registrationMeta: RegistrationMeta | null;
  profile: ProfileRow | null;
  profileLoading: boolean;
  profileError: string | null;
  setSession: (userId: string | null) => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (patch: ProfileUpdate) => Promise<void>;
  /** Sync auth (métadonnées + téléphone si modifié) et ligne `profiles`. */
  updateAccount: (payload: AccountUpdatePayload) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  userId: null,
  sessionLoading: true,
  registrationMeta: null,
  profile: null,
  profileLoading: false,
  profileError: null,

  setSession: (userId) => {
    set({ userId });
  },

  fetchProfile: async () => {
    const userId = get().userId;
    if (userId === null) {
      set({
        profile: null,
        profileLoading: false,
        profileError: null,
      });
      return;
    }
    set({ profileLoading: true, profileError: null });
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (get().userId !== userId) {
      return;
    }
    if (error !== null) {
      logger.error('fetchProfile', error);
      set({
        profileLoading: false,
        profileError: error.message,
      });
      return;
    }
    set({
      profile: data,
      profileLoading: false,
      profileError: null,
    });
  },

  updateProfile: async (patch) => {
    const userId = get().userId;
    if (userId === null) return;
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .maybeSingle();
    if (error !== null) {
      logger.error('updateProfile', error);
      throw new Error(error.message);
    }
    if (data !== null) {
      set({ profile: data });
    }
  },

  updateAccount: async (payload: AccountUpdatePayload) => {
    const userId = get().userId;
    if (userId === null) {
      throw new Error('Vous devez être connecté pour modifier votre compte.');
    }

    const prenom = validatePersonName(payload.firstName);
    const nom = validatePersonName(payload.lastName);
    if (prenom === null) {
      throw new Error('Renseignez votre prénom.');
    }
    if (nom === null) {
      throw new Error('Renseignez votre nom de famille.');
    }

    const emailNorm = validateRegistrationEmail(payload.email);
    if (emailNorm === null) {
      throw new Error(registrationEmailInvalidMessage());
    }

    const e164 = parseCiPhoneToE164(payload.nationalDigits);
    if (e164 === null) {
      throw new Error(
        `Saisissez ${CI_INTERNATIONAL_PREFIX} avec 10 chiffres (format XX XX XX XX XX).`,
      );
    }

    const displayName = buildDisplayName(prenom, nom);

    const { data: userResp, error: getUserErr } = await supabase.auth.getUser();
    if (getUserErr !== null) {
      logger.error('updateAccount getUser', getUserErr);
      throw new Error(getUserErr.message);
    }
    const authUser = userResp.user;
    if (authUser === null) {
      throw new Error('Session invalide. Reconnectez-vous.');
    }

    const currentPhone = authUser.phone ?? '';
    const authPayload: { data: Record<string, string>; phone?: string } = {
      data: {
        first_name: prenom,
        last_name: nom,
        email: emailNorm,
      },
    };
    if (e164 !== currentPhone) {
      authPayload.phone = e164;
    }

    const { error: authErr } = await supabase.auth.updateUser(authPayload);
    if (authErr !== null) {
      logger.error('updateAccount updateUser', authErr);
      throw new Error(mapAuthPasswordErrorToUserMessage(authErr.message));
    }

    /* E-mail : déjà synchronisé via auth.updateUser (user_metadata).
     * Colonne profiles.email : exiger la migration `006_profiles_email.sql` sur Supabase avant d’ajouter ici. */
    const { data: row, error: profErr } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        phone: e164,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (profErr !== null) {
      logger.error('updateAccount profile', profErr);
      throw new Error(profErr.message);
    }

    if (row !== null) {
      set({ profile: row });
    }

    const { data: sessionWrap } = await supabase.auth.getSession();
    syncSessionToStore(sessionWrap.session ?? null);
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error !== null) {
      logger.error('signOut', error);
      await supabase.auth.signOut({ scope: 'local' });
    }
    set({ profile: null, userId: null, registrationMeta: null });
  },
}));

function syncSessionToStore(session: Session | null): void {
  const id = session?.user.id ?? null;
  const registrationMeta =
    session?.user !== undefined
      ? registrationMetaFromUserMetadata(session.user.user_metadata)
      : null;
  useAuthStore.setState({
    userId: id,
    sessionLoading: false,
    registrationMeta,
  });
}

let authListenerRefCount = 0;
let removeAuthListener: (() => void) | null = null;

/**
 * Initialise l’écoute Auth Supabase et hydrate userId + profil (React Strict Mode : compteur de refs).
 */
export function initAuthStore(): () => void {
  authListenerRefCount += 1;
  if (removeAuthListener === null) {
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error !== null && isStaleStoredSessionAuthMessage(error.message)) {
          void supabase.auth.signOut({ scope: 'local' }).then(() => {
            syncSessionToStore(null);
            void useAuthStore.getState().fetchProfile();
          });
          return;
        }
        syncSessionToStore(data.session ?? null);
        void useAuthStore.getState().fetchProfile();
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        if (isStaleStoredSessionAuthMessage(msg)) {
          void supabase.auth.signOut({ scope: 'local' }).then(() => {
            syncSessionToStore(null);
            void useAuthStore.getState().fetchProfile();
          });
          return;
        }
        logger.error('getSession', e);
        syncSessionToStore(null);
        void useAuthStore.getState().fetchProfile();
      });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSessionToStore(session ?? null);
      void useAuthStore.getState().fetchProfile();
    });
    removeAuthListener = (): void => {
      data.subscription.unsubscribe();
    };
  }
  return (): void => {
    authListenerRefCount -= 1;
    if (authListenerRefCount <= 0 && removeAuthListener !== null) {
      removeAuthListener();
      removeAuthListener = null;
      authListenerRefCount = 0;
    }
  };
}
