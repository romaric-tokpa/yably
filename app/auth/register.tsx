import { type Href, router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { UserPlus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenErrorBoundary } from '@/components/common/ErrorBoundary';
import { RequiredFieldLabel } from '@/components/common/requiredFieldLabel';
import { useAppTheme } from '@/components/common/appThemeContext';
import { YablyLogo } from '@/components/common/yablyLogo';
import {
  registrationEmailInvalidMessage,
  validateRegistrationEmail,
} from '@/lib/auth-email';
import {
  mapAuthPasswordErrorToUserMessage,
  registrationPasswordErrorMessage,
  validatePersonName,
  validateRegistrationPassword,
} from '@/lib/auth-password';
import { spacing, yablyOrangeGradient } from '@/lib/constants';
import { fonts } from '@/lib/fonts';
import { logger } from '@/lib/logger';
import {
  CI_INTERNATIONAL_PREFIX,
  formatNationalPairs,
  parseCiPhoneToE164,
  phoneDigitsOnly,
} from '@/lib/phoneIvoryCoast';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';

function RegisterScreenInner() {
  const { theme: t } = useAppTheme();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [nationalDigits, setNationalDigits] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayNational = formatNationalPairs(nationalDigits);

  const onChangeNational = (text: string): void => {
    setError(null);
    let d = phoneDigitsOnly(text);
    if (d.startsWith('225')) {
      d = d.slice(3);
    }
    setNationalDigits(d.slice(0, 10));
  };

  const submit = useCallback(async (): Promise<void> => {
    setError(null);

    const prenom = validatePersonName(firstName);
    const nom = validatePersonName(lastName);
    if (prenom === null && nom === null) {
      setError('Renseignez votre prénom et votre nom de famille.');
      return;
    }
    if (prenom === null) {
      setError('Renseignez votre prénom.');
      return;
    }
    if (nom === null) {
      setError('Renseignez votre nom de famille.');
      return;
    }

    const emailNorm = validateRegistrationEmail(email);
    if (emailNorm === null) {
      setError(registrationEmailInvalidMessage());
      return;
    }

    const e164 = parseCiPhoneToE164(nationalDigits);
    if (e164 === null) {
      setError(
        `Saisissez ${CI_INTERNATIONAL_PREFIX} avec 10 chiffres (format XX XX XX XX XX).`,
      );
      return;
    }

    const pwdErr = validateRegistrationPassword(password, confirmPassword);
    if (pwdErr !== null) {
      setError(registrationPasswordErrorMessage(pwdErr));
      return;
    }

    setLoading(true);
    track('auth_started', { flow: 'register' });

    const { data, error: signErr } = await supabase.auth.signUp({
      phone: e164,
      password,
      options: {
        data: {
          first_name: prenom,
          last_name: nom,
          email: emailNorm,
        },
      },
    });

    setLoading(false);

    if (signErr !== null) {
      logger.error('signUp', signErr);
      setError(mapAuthPasswordErrorToUserMessage(signErr.message));
      return;
    }

    track('auth_completed', { method: 'phone_password_signup' });

    const rt =
      typeof returnTo === 'string' && returnTo.length > 0 ? returnTo : undefined;

    if (data.session !== null) {
      if (typeof rt === 'string' && rt.length > 0) {
        router.replace(rt as Href);
        return;
      }
      if (router.canDismiss()) {
        router.dismiss(2);
        return;
      }
      if (router.canGoBack()) {
        router.back();
        return;
      }
      router.replace('/(tabs)' as Href);
      return;
    }

    /* Pas de session tout de suite : invitation à se connecter (ex. config. Supabase). */
    router.replace({
      pathname: '/auth/login',
      params: {
        afterSignup: '1',
        ...(rt !== undefined ? { returnTo: rt } : {}),
      },
    });
  }, [
    firstName,
    lastName,
    email,
    nationalDigits,
    password,
    confirmPassword,
    returnTo,
  ]);

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: t.bg }}
      edges={['top', 'left', 'right']}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: Math.max(spacing.screenHorizontal, 28),
            paddingTop: 16,
            paddingBottom: 40,
            width: '100%',
            flexGrow: 1,
          }}
        >
          <View className="mb-6 items-center">
            <YablyLogo size={48} color={t.accent} fillOpacity={0.12} strokeWidth={2.2} />
            <Text
              className="mt-4 text-center text-[24px] font-black"
              style={{ color: t.text, fontFamily: fonts.nunitoBlack }}
            >
              Créer un compte
            </Text>
            <Text
              className="mt-2 px-2 text-center text-[13px] leading-5"
              style={{ color: t.textSoft, fontFamily: fonts.outfitRegular }}
            >
              Prénom, nom, e-mail, numéro et mot de passe pour créer votre compte
            </Text>
          </View>

          <RequiredFieldLabel t={t}>Prénom</RequiredFieldLabel>
          <TextInput
            accessibilityLabel="Prénom, champ requis"
            className="mb-3 rounded-[14px] border px-3.5 text-[15px]"
            style={{
              width: '100%',
              minHeight: 48,
              borderColor: t.border,
              borderWidth: 1.5,
              backgroundColor: t.surface,
              color: t.text,
              fontFamily: fonts.outfitMedium,
            }}
            value={firstName}
            onChangeText={(v) => {
              setError(null);
              setFirstName(v);
            }}
            placeholder="Ex. Romaric"
            placeholderTextColor={t.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
            textContentType="givenName"
            editable={!loading}
          />

          <RequiredFieldLabel t={t}>Nom de famille</RequiredFieldLabel>
          <TextInput
            accessibilityLabel="Nom de famille, champ requis"
            className="mb-3 rounded-[14px] border px-3.5 text-[15px]"
            style={{
              width: '100%',
              minHeight: 48,
              borderColor: t.border,
              borderWidth: 1.5,
              backgroundColor: t.surface,
              color: t.text,
              fontFamily: fonts.outfitMedium,
            }}
            value={lastName}
            onChangeText={(v) => {
              setError(null);
              setLastName(v);
            }}
            placeholder="Ex. Tokpa"
            placeholderTextColor={t.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
            textContentType="familyName"
            editable={!loading}
          />

          <RequiredFieldLabel t={t}>E-mail</RequiredFieldLabel>
          <TextInput
            accessibilityLabel="Adresse e-mail, champ requis"
            className="mb-3 rounded-[14px] border px-3.5 text-[15px]"
            style={{
              width: '100%',
              minHeight: 48,
              borderColor: t.border,
              borderWidth: 1.5,
              backgroundColor: t.surface,
              color: t.text,
              fontFamily: fonts.outfitMedium,
            }}
            value={email}
            onChangeText={(v) => {
              setError(null);
              setEmail(v);
            }}
            placeholder="exemple@email.com"
            placeholderTextColor={t.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            editable={!loading}
          />

          <RequiredFieldLabel t={t}>Téléphone</RequiredFieldLabel>
          <View className="mb-3 w-full flex-row items-stretch gap-1.5">
            <View
              className="justify-center rounded-[10px] border px-2.5"
              style={{
                minHeight: 40,
                borderColor: t.border,
                borderWidth: 1,
                backgroundColor: t.surface,
              }}
            >
              <Text
                className="text-[13px] font-semibold"
                style={{ color: t.text, fontFamily: fonts.outfitSemiBold }}
              >
                {CI_INTERNATIONAL_PREFIX}
              </Text>
            </View>
            <View
              className="min-w-0 flex-1 flex-row items-center rounded-[10px] border px-2.5"
              style={{
                minHeight: 40,
                borderColor: t.border,
                borderWidth: 1,
                backgroundColor: t.surface,
              }}
            >
              <TextInput
                accessibilityLabel="Numéro mobile sans indicatif, champ requis"
                className="min-w-0 flex-1 text-[14px] font-medium"
                placeholder="07 XX XX XX XX"
                placeholderTextColor={t.textMuted}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                maxLength={17}
                value={displayNational}
                onChangeText={onChangeNational}
                style={{ color: t.text, fontFamily: fonts.outfitMedium }}
                editable={!loading}
              />
            </View>
          </View>

          <RequiredFieldLabel t={t}>Mot de passe</RequiredFieldLabel>
          <TextInput
            accessibilityLabel="Mot de passe, champ requis"
            className="mb-3 rounded-[14px] border px-3.5 text-[15px]"
            style={{
              width: '100%',
              minHeight: 48,
              borderColor: t.border,
              borderWidth: 1.5,
              backgroundColor: t.surface,
              color: t.text,
              fontFamily: fonts.outfitMedium,
            }}
            value={password}
            onChangeText={(v) => {
              setError(null);
              setPassword(v);
            }}
            placeholder="Minimum 8 caractères"
            placeholderTextColor={t.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            editable={!loading}
          />

          <RequiredFieldLabel t={t}>Confirmation du mot de passe</RequiredFieldLabel>
          <TextInput
            accessibilityLabel="Confirmation du mot de passe, champ requis"
            className="mb-2 rounded-[14px] border px-3.5 text-[15px]"
            style={{
              width: '100%',
              minHeight: 48,
              borderColor: t.border,
              borderWidth: 1.5,
              backgroundColor: t.surface,
              color: t.text,
              fontFamily: fonts.outfitMedium,
            }}
            value={confirmPassword}
            onChangeText={(v) => {
              setError(null);
              setConfirmPassword(v);
            }}
            placeholder="Retaper le mot de passe"
            placeholderTextColor={t.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            editable={!loading}
          />

          <Text
            className="mb-4 text-[11px] leading-4"
            style={{ color: t.textMuted, fontFamily: fonts.outfitRegular }}
          >
            Au moins 8 caractères, une lettre et un chiffre.
          </Text>

          {error !== null ? (
            <Text
              className="mb-3 text-[13px] leading-5"
              style={{ color: t.danger, fontFamily: fonts.outfitRegular }}
            >
              {error}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="S’inscrire"
            accessibilityState={{ disabled: loading }}
            className="overflow-hidden rounded-2xl"
            disabled={loading}
            onPress={() => void submit()}
            style={({ pressed }) => ({
              opacity: loading ? 0.75 : pressed ? 0.92 : 1,
            })}
          >
            <LinearGradient
              colors={[...yablyOrangeGradient]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                minHeight: 52,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 14,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <UserPlus size={18} color="#FFFFFF" strokeWidth={2} />
                  <Text
                    className="text-[15px] font-bold text-white"
                    style={{ fontFamily: fonts.outfitBold }}
                  >
                    S&apos;inscrire
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            className="mt-6 py-2"
            onPress={() => router.replace('/auth/login' as Href)}
            disabled={loading}
          >
            <Text
              className="text-center text-[14px] font-semibold"
              style={{ color: t.primary, fontFamily: fonts.outfitSemiBold }}
            >
              Déjà un compte ? Se connecter
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function RegisterScreen() {
  return (
    <ScreenErrorBoundary>
      <RegisterScreenInner />
    </ScreenErrorBoundary>
  );
}
