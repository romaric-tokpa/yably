import { type Href, router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { LogIn } from 'lucide-react-native';
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
import { useAppTheme } from '@/components/common/appThemeContext';
import { YablyLogo } from '@/components/common/yablyLogo';
import { mapAuthPasswordErrorToUserMessage } from '@/lib/auth-password';
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

function LoginScreenInner() {
  const { theme: t } = useAppTheme();
  const { returnTo, afterSignup } = useLocalSearchParams<{
    returnTo?: string;
    afterSignup?: string;
  }>();

  const signupInfoVisible = afterSignup === '1';

  const [nationalDigits, setNationalDigits] = useState('');
  const [password, setPassword] = useState('');
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

  const signIn = useCallback(async (): Promise<void> => {
    const e164 = parseCiPhoneToE164(nationalDigits);
    if (e164 === null) {
      setError(
        `Saisissez ${CI_INTERNATIONAL_PREFIX} avec 10 chiffres (format XX XX XX XX XX).`,
      );
      return;
    }
    if (password.length === 0) {
      setError('Saisissez votre mot de passe.');
      return;
    }

    setLoading(true);
    setError(null);
    track('auth_started', { flow: 'login' });

    const { error: signError } = await supabase.auth.signInWithPassword({
      phone: e164,
      password,
    });

    setLoading(false);

    if (signError !== null) {
      logger.error('signInWithPassword', signError);
      setError(mapAuthPasswordErrorToUserMessage(signError.message));
      return;
    }

    track('auth_completed', { method: 'phone_password' });

    if (typeof returnTo === 'string' && returnTo.length > 0) {
      router.replace(returnTo as Href);
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
  }, [nationalDigits, password, returnTo]);

  const continueWithoutAccount = (): void => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as Href);
    }
  };

  const goRegister = (): void => {
    const rt =
      typeof returnTo === 'string' && returnTo.length > 0 ? returnTo : undefined;
    if (rt !== undefined) {
      router.push({
        pathname: '/auth/register',
        params: { returnTo: rt },
      });
      return;
    }
    router.push('/auth/register' as Href);
  };

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
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: Math.max(spacing.screenHorizontal, 28),
            paddingTop: 24,
            paddingBottom: 32,
          }}
        >
          <View className="mb-8 items-center">
            <YablyLogo size={56} color={t.accent} fillOpacity={0.12} strokeWidth={2.5} />
            <Text
              className="mt-4 text-center text-[28px] font-black"
              style={{ color: t.text, fontFamily: fonts.nunitoBlack }}
            >
              Bienvenue sur Yably
            </Text>
            <Text
              className="mt-2 px-2 text-center text-[13px] leading-5"
              style={{ color: t.textSoft, fontFamily: fonts.outfitRegular }}
            >
              Connectez-vous avec votre numéro et votre mot de passe
            </Text>
          </View>

          {signupInfoVisible ? (
            <View
              className="mb-4 rounded-2xl border px-3 py-3"
              style={{
                borderColor: t.border,
                backgroundColor: t.surface,
              }}
            >
              <Text
                className="text-center text-[13px] leading-5"
                style={{ color: t.text, fontFamily: fonts.outfitRegular }}
              >
                Compte créé. Utilisez le même numéro et le même mot de passe pour vous
                connecter.
              </Text>
            </View>
          ) : null}

          <View>
            <Text
              className="mb-2 text-xs font-semibold"
              style={{ color: t.text, fontFamily: fonts.outfitSemiBold }}
            >
              Numéro de téléphone
            </Text>
            <View className="flex-row items-stretch gap-1.5">
              <View
                className="justify-center rounded-[10px] border px-2.5"
                style={{
                  minHeight: 40,
                  borderColor: error !== null ? t.danger : t.border,
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
                  borderColor: error !== null ? t.danger : t.border,
                  borderWidth: 1,
                  backgroundColor: t.surface,
                }}
              >
                <TextInput
                  accessibilityLabel="Numéro mobile sans indicatif"
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

            <Text
              className="mb-2 mt-4 text-xs font-semibold"
              style={{ color: t.text, fontFamily: fonts.outfitSemiBold }}
            >
              Mot de passe
            </Text>
            <TextInput
              accessibilityLabel="Mot de passe"
              className="h-12 rounded-[14px] border px-3.5 text-[15px]"
              style={{
                borderColor: error !== null ? t.danger : t.border,
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
              placeholder="Votre mot de passe"
              placeholderTextColor={t.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              editable={!loading}
            />

            {error !== null ? (
              <Text
                className="mt-2 text-xs leading-4"
                style={{ color: t.danger, fontFamily: fonts.outfitRegular }}
              >
                {error}
              </Text>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Se connecter"
            accessibilityState={{ disabled: loading }}
            className="mt-6 overflow-hidden rounded-2xl"
            disabled={loading}
            onPress={() => void signIn()}
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
                  <LogIn size={18} color="#FFFFFF" strokeWidth={2} />
                  <Text
                    className="text-[15px] font-bold text-white"
                    style={{ fontFamily: fonts.outfitBold }}
                  >
                    Se connecter
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            className="mt-5 py-2"
            onPress={goRegister}
            disabled={loading}
          >
            <Text
              className="text-center text-[14px] font-semibold"
              style={{ color: t.primary, fontFamily: fonts.outfitSemiBold }}
            >
              Créer un compte
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continuer sans créer de compte"
            className="mt-2 flex-row items-center justify-center gap-1.5 py-2"
            onPress={continueWithoutAccount}
            disabled={loading}
          >
            <Text
              className="text-center text-xs font-semibold"
              style={{ color: t.primary, fontFamily: fonts.outfitSemiBold }}
            >
              Continuer sans compte
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function LoginScreen() {
  return (
    <ScreenErrorBoundary>
      <LoginScreenInner />
    </ScreenErrorBoundary>
  );
}
