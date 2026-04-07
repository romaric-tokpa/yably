import { useFocusEffect, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Save } from 'lucide-react-native';
import { useCallback, useState, type ReactElement } from 'react';
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
import { useAuthSession } from '@/hooks/useAuthSession';
import { spacing, yablyOrangeGradient } from '@/lib/constants';
import { fonts } from '@/lib/fonts';
import {
  firstNameFromDisplayName,
  lastNameFromDisplayName,
} from '@/lib/greeting';
import { logger } from '@/lib/logger';
import {
  CI_INTERNATIONAL_PREFIX,
  formatNationalPairs,
  national10FromProfilePhone,
  phoneDigitsOnly,
} from '@/lib/phoneIvoryCoast';
import { useAuthStore } from '@/stores/authStore';

function EditAccountScreenInner(): ReactElement {
  const { theme: t } = useAppTheme();
  const { userId, isLoading: authLoading } = useAuthSession();
  const profile = useAuthStore((s) => s.profile);
  const registrationMeta = useAuthStore((s) => s.registrationMeta);
  const profileLoading = useAuthStore((s) => s.profileLoading);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const updateAccount = useAuthStore((s) => s.updateAccount);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [nationalDigits, setNationalDigits] = useState('');
  const [saving, setSaving] = useState(false);
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

  useFocusEffect(
    useCallback(() => {
      if (userId !== null) {
        void fetchProfile();
      }
    }, [userId, fetchProfile]),
  );

  useFocusEffect(
    useCallback(() => {
      if (profile === null) {
        return;
      }
      const fn =
        registrationMeta !== null && registrationMeta.firstName.length > 0
          ? registrationMeta.firstName
          : firstNameFromDisplayName(profile.display_name);
      const ln =
        registrationMeta !== null && registrationMeta.lastName.length > 0
          ? registrationMeta.lastName
          : lastNameFromDisplayName(profile.display_name);
      const emailFromRow = profile.email?.trim() ?? '';
      const em =
        emailFromRow.length > 0
          ? emailFromRow
          : registrationMeta !== null && registrationMeta.email.length > 0
            ? registrationMeta.email
            : '';
      setFirstName(fn);
      setLastName(ln);
      setEmail(em);
      setNationalDigits(national10FromProfilePhone(profile.phone));
      setError(null);
    }, [profile, registrationMeta]),
  );

  const onSubmit = async (): Promise<void> => {
    setError(null);
    setSaving(true);
    try {
      await updateAccount({
        firstName,
        lastName,
        email,
        nationalDigits,
      });
      router.back();
    } catch (e) {
      logger.error('edit-account submit', e);
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  if (!authLoading && userId === null) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: t.bg }}
        edges={['left', 'right']}
      >
        <Text className="text-center" style={{ color: t.textSoft }}>
          Connectez-vous pour modifier vos informations.
        </Text>
      </SafeAreaView>
    );
  }

  if (authLoading || (userId !== null && profileLoading && profile === null)) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: t.bg }}
        edges={['left', 'right']}
      >
        <ActivityIndicator color={t.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (profile === null) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: t.bg }}
        edges={['left', 'right']}
      >
        <Text className="text-center" style={{ color: t.danger }}>
          Profil introuvable.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: t.bg }}
      edges={['left', 'right']}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: Math.max(spacing.screenHorizontal, 28),
            paddingTop: 16,
            paddingBottom: 40,
            flexGrow: 1,
          }}
        >
          <Text
            className="mb-1 text-[13px] leading-5"
            style={{ color: t.textSoft, fontFamily: fonts.outfitRegular }}
          >
            Ces informations sont utilisées pour votre profil et vos rappels. Si
            vous changez de numéro, Supabase peut vous demander une validation
            par SMS selon la configuration du projet.
          </Text>

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
            editable={!saving}
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
            editable={!saving}
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
            editable={!saving}
          />

          <RequiredFieldLabel t={t}>Téléphone</RequiredFieldLabel>
          <View className="mb-4 w-full flex-row items-stretch gap-1.5">
            <View
              className="justify-center rounded-[10px] border px-2.5"
              style={{
                minHeight: 48,
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
                minHeight: 48,
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
                editable={!saving}
              />
            </View>
          </View>

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
            accessibilityLabel="Enregistrer les modifications"
            accessibilityState={{ disabled: saving }}
            className="overflow-hidden rounded-2xl"
            disabled={saving}
            onPress={() => void onSubmit()}
            style={({ pressed }) => ({
              opacity: saving ? 0.75 : pressed ? 0.92 : 1,
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
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Save size={18} color="#FFFFFF" strokeWidth={2} />
                  <Text
                    className="text-[15px] font-bold text-white"
                    style={{ fontFamily: fonts.outfitBold }}
                  >
                    Enregistrer
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function EditAccountScreen(): ReactElement {
  return (
    <ScreenErrorBoundary>
      <EditAccountScreenInner />
    </ScreenErrorBoundary>
  );
}
