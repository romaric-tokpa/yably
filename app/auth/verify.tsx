import { type Href, router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2 } from 'lucide-react-native';
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
import { spacing, yablyOrangeGradient } from '@/lib/constants';
import { fonts } from '@/lib/fonts';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';

function VerifyScreenInner() {
  const { theme: t } = useAppTheme();
  const { phone, returnTo } = useLocalSearchParams<{
    phone: string;
    returnTo?: string;
  }>();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyOtp = useCallback(async (): Promise<void> => {
    if (!phone) {
      setError('Numéro de téléphone introuvable.');
      return;
    }

    if (code.length !== 6) {
      setError('Veuillez entrer le code à 6 chiffres.');
      return;
    }

    setLoading(true);
    setError(null);
    track('auth_started', { flow: 'verify_otp' });

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: 'sms',
    });

    setLoading(false);

    if (verifyError !== null) {
      logger.error('verifyOtp', verifyError);
      setError(verifyError.message);
      return;
    }

    track('auth_completed', { method: 'phone_otp' });

    const rt =
      typeof returnTo === 'string' && returnTo.length > 0 ? returnTo : undefined;

    if (rt !== undefined) {
      router.replace(rt as Href);
      return;
    }
    if (router.canDismiss()) {
      router.dismissAll();
    }
    router.replace('/(tabs)' as Href);
  }, [phone, code, returnTo]);

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
              Vérification SMS
            </Text>
            <Text
              className="mt-2 px-2 text-center text-[13px] leading-5"
              style={{ color: t.textSoft, fontFamily: fonts.outfitRegular }}
            >
              Un code a été envoyé au {phone}. Veuillez le saisir ci-dessous.
            </Text>
          </View>

          <View>
            <Text
              className="mb-2 text-xs font-semibold"
              style={{ color: t.text, fontFamily: fonts.outfitSemiBold }}
            >
              Code de vérification
            </Text>
            <TextInput
              accessibilityLabel="Code de vérification"
              className="h-12 rounded-[14px] border px-3.5 text-[15px] text-center"
              style={{
                borderColor: error !== null ? t.danger : t.border,
                borderWidth: 1.5,
                backgroundColor: t.surface,
                color: t.text,
                fontFamily: fonts.outfitMedium,
                letterSpacing: 8,
                fontSize: 24,
              }}
              value={code}
              onChangeText={(v) => {
                setError(null);
                setCode(v.replace(/[^0-9]/g, '').slice(0, 6));
              }}
              placeholder="000000"
              placeholderTextColor={t.textMuted}
              keyboardType="number-pad"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="oneTimeCode"
              editable={!loading}
            />

            {error !== null ? (
              <Text
                className="mt-2 text-xs leading-4 text-center"
                style={{ color: t.danger, fontFamily: fonts.outfitRegular }}
              >
                {error}
              </Text>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Vérifier"
            accessibilityState={{ disabled: loading }}
            className="mt-6 overflow-hidden rounded-2xl"
            disabled={loading}
            onPress={() => void verifyOtp()}
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
                  <CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2} />
                  <Text
                    className="text-[15px] font-bold text-white"
                    style={{ fontFamily: fonts.outfitBold }}
                  >
                    Vérifier
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            className="mt-5 py-2"
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/auth/login' as Href);
              }
            }}
            disabled={loading}
          >
            <Text
              className="text-center text-[14px] font-semibold"
              style={{ color: t.primary, fontFamily: fonts.outfitSemiBold }}
            >
              Modifier le numéro
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function VerifyScreen() {
  return (
    <ScreenErrorBoundary>
      <VerifyScreenInner />
    </ScreenErrorBoundary>
  );
}
