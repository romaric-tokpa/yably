import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ExpoLinking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Clock,
  Phone,
  Share2,
  User,
  Waypoints,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeOut, SlideInDown, ZoomIn } from 'react-native-reanimated';

import { ScreenErrorBoundary } from '@/components/common/ErrorBoundary';
import { YablyLogo } from '@/components/common/yablyLogo';
import { VerifiedBadge } from '@/components/pharmacy/VerifiedBadge';
import { VerificationButton } from '@/components/pharmacy/VerificationButton';
import { WaitTimeChip } from '@/components/pharmacy/WaitTimeChip';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useLocation } from '@/hooks/useLocation';
import { useOffline } from '@/hooks/useOffline';
import { useVerification } from '@/hooks/useVerification';
import { track, type DirectionsApp } from '@/lib/analytics';
import { borderRadius as radii, spacing, yablyOrangeGradient } from '@/lib/constants';
import { fonts } from '@/lib/fonts';
import { haversineDistanceMeters } from '@/lib/distance';
import { fetchPharmacyDeGardeById } from '@/lib/fetchPharmacyDeGardeById';
import { formatDistance, formatDuration } from '@/lib/format';
import { useAppTheme } from '@/components/common/appThemeContext';
import { supabase } from '@/lib/supabase';
import type { PharmacyDeGarde } from '@/types/pharmacy';

function normalizeId(raw: string | string[] | undefined): string {
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw[0] ?? '';
  return '';
}

function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  return digits.startsWith('tel:') ? digits : `tel:${digits}`;
}

function PharmacyDetailScreenInner() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const pharmacyId = normalizeId(idParam);
  const insets = useSafeAreaInsets();
  const { theme: t } = useAppTheme();
  const { location } = useLocation();
  const { userId, isLoading: authLoading } = useAuthSession();
  const { isOffline: networkOffline } = useOffline();
  const queryClient = useQueryClient();
  const [toastVisible, setToastVisible] = useState(false);

  const lat = location?.latitude ?? null;
  const lng = location?.longitude ?? null;

  const pharmacyQuery = useQuery({
    queryKey: ['pharmacy-de-garde', pharmacyId, lat, lng],
    enabled: pharmacyId.length > 0,
    queryFn: async (): Promise<PharmacyDeGarde | null> => {
      return fetchPharmacyDeGardeById(pharmacyId, lat, lng);
    },
  });

  const p = pharmacyQuery.data ?? null;

  const { verify } = useVerification(location);

  const alreadyVerifiedQuery = useQuery({
    queryKey: ['verification-recent-self', pharmacyId, userId],
    enabled: pharmacyId.length > 0 && userId !== null,
    queryFn: async (): Promise<boolean> => {
      if (userId === null) return false;
      const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('verifications')
        .select('id')
        .eq('pharmacy_id', pharmacyId)
        .eq('user_id', userId)
        .gte('created_at', since)
        .limit(1);
      if (error !== null) throw new Error(error.message);
      return (data?.length ?? 0) > 0;
    },
  });

  const distanceMeters = useMemo(() => {
    if (p === null || lat === null || lng === null) return null;
    return Math.round(
      haversineDistanceMeters(lat, lng, p.latitude, p.longitude),
    );
  }, [p, lat, lng]);

  const tooFar =
    distanceMeters !== null && distanceMeters > 500;

  const alreadyVerified = alreadyVerifiedQuery.data === true;
  const isAuthenticated = userId !== null;

  useEffect(() => {
    if (p !== null) {
      track('pharmacy_detail_viewed', { pharmacy_id: p.id });
    }
  }, [p]);

  const openCall = useCallback(() => {
    if (p === null) return;
    track('call_button_tapped', { pharmacy_id: p.id });
    void Linking.openURL(telHref(p.phone_primary));
  }, [p]);

  const openDirections = useCallback(
    (app: DirectionsApp) => {
      if (p === null) return;
      track('directions_button_tapped', {
        pharmacy_id: p.id,
        app,
      });
      const { latitude: la, longitude: lo } = p;
      const encName = encodeURIComponent(p.name);
      if (app === 'google_maps') {
        void Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&destination=${la},${lo}`,
        );
      } else if (app === 'apple_maps') {
        void Linking.openURL(
          `maps://?daddr=${la},${lo}&q=${encName}`,
        );
      } else {
        void Linking.openURL(`waze://?ll=${la},${lo}&navigate=yes`);
      }
    },
    [p],
  );

  const pickDirections = useCallback(() => {
    if (p === null) return;
    if (Platform.OS === 'ios') {
      Alert.alert('Itinéraire', 'Choisir une application', [
        {
          text: 'Plans',
          onPress: () => openDirections('apple_maps'),
        },
        {
          text: 'Google Maps',
          onPress: () => openDirections('google_maps'),
        },
        {
          text: 'Waze',
          onPress: () => openDirections('waze'),
        },
        { text: 'Annuler', style: 'cancel' },
      ]);
    } else {
      openDirections('google_maps');
    }
  }, [p, openDirections]);

  const sharePharmacy = useCallback(async () => {
    if (p === null) return;
    track('share_tapped', { pharmacy_id: p.id });
    const url = ExpoLinking.createURL(`/pharmacy/${p.id}`);
    try {
      await Share.share({
        message: `${p.name} — Pharmacies de garde\n${url}`,
        title: p.name,
      });
    } catch {
      /* annulé */
    }
  }, [p]);

  const onVerifyPress = useCallback(
    async (pid: string) => {
      if (p === null) return;
      const dist =
        lat !== null && lng !== null
          ? Math.round(
              haversineDistanceMeters(lat, lng, p.latitude, p.longitude),
            )
          : 0;
      const ok = await verify(pid, 'open', {
        latitude: p.latitude,
        longitude: p.longitude,
      });
      if (ok) {
        track('verification_submitted', {
          pharmacy_id: pid,
          status: 'open',
          distance: dist,
        });
        setToastVisible(true);
        setTimeout(() => setToastVisible(false), 3500);
        void queryClient.invalidateQueries({
          queryKey: ['pharmacy-de-garde', pharmacyId],
        });
        void queryClient.invalidateQueries({ queryKey: ['verification-recent-self'] });
      }
    },
    [p, verify, lat, lng, pharmacyId, queryClient],
  );

  const horaireLabel = useMemo(() => {
    if (p === null) return '';
    if (p.is_24h) {
      return 'Garde 24h/24 pendant la période affichée.';
    }
    return 'Ce soir 20h → demain 8h (garde de nuit).';
  }, [p]);

  const loading = pharmacyQuery.isPending;
  const error = pharmacyQuery.error;
  const notFound = pharmacyQuery.isSuccess && p === null;

  if (pharmacyId.length === 0) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: 'transparent' }}>
          <Text>Identifiant de pharmacie manquant.</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1" style={{ backgroundColor: 'transparent' }}>
        {/* Header specs §4.4 */}
        <View
          className="flex-row items-center justify-between px-4 pb-3 pt-2"
          style={{
            paddingTop: insets.top + 4,
            backgroundColor: t.bg,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retour"
            hitSlop={12}
            onPress={() => router.back()}
            className="h-[38px] w-[38px] items-center justify-center rounded-xl border"
            style={{ borderColor: t.border, backgroundColor: t.surface }}
          >
            <ChevronLeft size={22} color={t.text} strokeWidth={2} />
          </Pressable>
          <Text
            className="flex-1 text-center text-base font-bold"
            style={{ color: t.text, fontFamily: fonts.outfitBold }}
          >
            Détails
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Partager cette pharmacie"
            hitSlop={12}
            onPress={() => void sharePharmacy()}
            className="h-[38px] w-[38px] items-center justify-center rounded-xl border"
            style={{ borderColor: t.border, backgroundColor: t.surface }}
          >
            <Share2 size={18} color={t.textSoft} strokeWidth={2} />
          </Pressable>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center p-8">
            <ActivityIndicator color={t.primary} size="large" />
            <Text className="mt-3 text-[14px]" style={{ color: t.textSoft }}>
              Chargement…
            </Text>
          </View>
        ) : error !== null ? (
          <View className="flex-1 items-center justify-center p-6">
            <Text className="text-center" style={{ color: t.danger }}>
              {error instanceof Error ? error.message : 'Erreur de chargement'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Réessayer de charger la pharmacie"
              className="mt-4 rounded-[14px] px-5 py-3"
              style={{ backgroundColor: t.primary }}
              onPress={() => void pharmacyQuery.refetch()}
            >
              <Text className="text-[16px] font-bold text-white">Réessayer</Text>
            </Pressable>
          </View>
        ) : notFound ? (
          <View className="flex-1 items-center justify-center p-6">
            <Text style={{ color: t.textSoft }}>Pharmacie introuvable.</Text>
          </View>
        ) : p === null ? (
          <View className="flex-1 items-center justify-center p-8">
            <ActivityIndicator color={t.primary} size="large" />
          </View>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: spacing.screenHorizontal,
                paddingTop: 12,
                paddingBottom: 120 + insets.bottom,
              }}
              showsVerticalScrollIndicator={false}
            >
              <Card style={{ padding: 18, borderRadius: 20 }}>
                {p.photo_url !== null && p.photo_url.length > 0 ? (
                  <Image
                    source={{ uri: p.photo_url }}
                    recyclingKey={p.id}
                    style={{
                      width: '100%',
                      height: 200,
                      borderRadius: radii.card,
                      marginBottom: spacing.cardPadding,
                    }}
                    contentFit="cover"
                    placeholderContentFit="cover"
                    cachePolicy="memory-disk"
                    transition={280}
                    accessibilityLabel={`Photo de la pharmacie ${p.name}`}
                    placeholder={{ blurhash: 'L5H2EC=PM+yV0g-mq.wG9c010J}I' }}
                  />
                ) : null}
                <View className="mb-3 flex-row items-start justify-between gap-3">
                  <View className="min-w-0 flex-1">
                    <Text
                      className="text-lg font-extrabold"
                      style={{ color: t.text, fontFamily: fonts.outfitExtraBold }}
                    >
                      {p.name}
                    </Text>
                    <Text
                      className="mt-1 text-xs leading-5"
                      style={{ color: t.textSoft, fontFamily: fonts.outfitRegular }}
                    >
                      {p.address}
                    </Text>
                    {p.commune.length > 0 || p.city.length > 0 ? (
                      <Text
                        className="mt-0.5 text-[11px] leading-5"
                        style={{ color: t.textMuted, fontFamily: fonts.outfitRegular }}
                      >
                        {[p.commune, p.city].filter((s) => s.length > 0).join(' · ')}
                      </Text>
                    ) : null}
                    {p.pharmacist_name !== null ? (
                      <View className="mt-1.5 flex-row items-center gap-1.5">
                        <User size={13} color={t.textMuted} strokeWidth={2} />
                        <Text
                          className="text-xs"
                          style={{ color: t.textMuted, fontFamily: fonts.outfitRegular }}
                        >
                          {p.pharmacist_name}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <LinearGradient
                    colors={[t.accent, t.accentGlow]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <YablyLogo size={28} color="#FFFFFF" fillOpacity={0.25} strokeWidth={1.8} />
                  </LinearGradient>
                </View>

                <View className="mt-4 flex-row flex-wrap gap-2">
                  {p.last_verification_status === 'closed' ? (
                    <Badge label="Fermeture signalée" variant="danger" />
                  ) : (
                    <Badge label="Ouvert" variant="success" />
                  )}
                  <View className="max-w-[48%]">
                    <VerifiedBadge
                      verificationCount={p.verification_count}
                      lastVerification={p.last_verification}
                      lastStatus={p.last_verification_status}
                    />
                  </View>
                  <WaitTimeChip minutes={p.avg_wait_time} />
                </View>

                <View className="mt-2 flex-row gap-2">
                  {[
                    { v: formatDistance(p.distance_km), l: 'Distance' },
                    { v: formatDuration(p.duration_min), l: 'Trajet' },
                    { v: `${p.rating.toFixed(1)}/5`, l: 'Note' },
                  ].map((s) => (
                    <View
                      key={s.l}
                      className="min-w-0 flex-1 items-center rounded-[14px] border py-3 px-1"
                      style={{
                        borderColor: t.border,
                        backgroundColor: t.surfaceAlt,
                      }}
                    >
                      <Text
                        className="text-base font-extrabold tabular-nums"
                        style={{ color: t.text, fontFamily: fonts.outfitExtraBold }}
                      >
                        {s.v}
                      </Text>
                      <Text
                        className="mt-0.5 text-[10px]"
                        style={{ color: t.textMuted, fontFamily: fonts.outfitMedium }}
                      >
                        {s.l}
                      </Text>
                    </View>
                  ))}
                </View>

                <View className="mt-4 flex-row items-start gap-2">
                  <Clock size={20} color={t.accent} />
                  <View className="flex-1">
                    <Text className="text-[14px] font-semibold" style={{ color: t.text }}>
                      Horaires de garde
                    </Text>
                    <Text className="mt-0.5 text-[14px] leading-5" style={{ color: t.textSoft }}>
                      {horaireLabel}
                    </Text>
                  </View>
                </View>

                <Text
                  className="mt-4 text-xs font-bold"
                  style={{ color: t.text, fontFamily: fonts.outfitBold }}
                >
                  Accepte
                </Text>
                <View className="mt-2 flex-row flex-wrap gap-1.5">
                  {p.accepted_insurance.length === 0 ? (
                    <Text style={{ color: t.textMuted, fontFamily: fonts.outfitRegular }}>—</Text>
                  ) : (
                    p.accepted_insurance.map((ins) => (
                      <View
                        key={ins}
                        className="rounded-[10px] border px-3 py-1.5"
                        style={{
                          borderColor: t.accentMuted,
                          backgroundColor: t.accentMuted,
                        }}
                      >
                        <Text
                          className="text-[11px] font-semibold"
                          style={{ color: t.accent, fontFamily: fonts.outfitSemiBold }}
                        >
                          {ins}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </Card>

              <View className="mt-3 rounded-[18px] border p-4" style={{ borderColor: t.border, backgroundColor: t.surface }}>
                <Text
                  className="text-[13px] font-bold"
                  style={{ color: t.text, fontFamily: fonts.outfitBold }}
                >
                  Vérification communautaire
                </Text>
                <Text
                  className="mt-1 text-[11px] leading-5"
                  style={{ color: t.textSoft, fontFamily: fonts.outfitRegular }}
                >
                  {p.verification_count} personne{p.verification_count > 1 ? 's' : ''}{' '}
                  {p.verification_count > 1 ? 'ont' : 'a'} confirmé l’ouverture récemment.
                </Text>

                {!authLoading && !isAuthenticated ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Se connecter pour vérifier cette pharmacie"
                    className="mt-4 overflow-hidden rounded-[14px]"
                    style={{ borderWidth: 1, borderColor: t.primary }}
                    onPress={() =>
                      router.push({
                        pathname: '/auth/login',
                        params: {
                          returnTo: `/pharmacy/${pharmacyId}`,
                        },
                      })
                    }
                  >
                    <LinearGradient
                      colors={[t.primaryMuted, t.surface]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ paddingVertical: 14, paddingHorizontal: 12 }}
                    >
                      <Text
                        className="text-center text-[14px] font-bold"
                        style={{ color: t.primary, fontFamily: fonts.outfitBold }}
                      >
                        Connectez-vous pour vérifier
                      </Text>
                    </LinearGradient>
                  </Pressable>
                ) : null}

                {isAuthenticated && alreadyVerified ? (
                  <View
                    className="mt-4 rounded-[14px] border px-4 py-4"
                    style={{ borderColor: t.border, backgroundColor: t.surfaceAlt }}
                  >
                    <Text className="text-center text-[15px] font-semibold" style={{ color: t.textSoft }}>
                      Vous avez déjà vérifié cette pharmacie (moins de 2 h).
                    </Text>
                  </View>
                ) : null}

                {isAuthenticated && !alreadyVerified && lat === null ? (
                  <Text className="mt-3 text-[14px] leading-5" style={{ color: t.textSoft }}>
                    Activez la position pour savoir si vous pouvez vérifier.
                  </Text>
                ) : null}

                {isAuthenticated && !alreadyVerified && lat !== null && tooFar ? (
                  <VerificationButton
                    pharmacyId={p.id}
                    onVerify={onVerifyPress}
                    disabled
                    disabledLabel={`Rapprochez-vous pour vérifier (vous êtes à ${distanceMeters ?? '?'} m, max 500 m).`}
                  />
                ) : null}

                {isAuthenticated && !alreadyVerified && lat !== null && !tooFar ? (
                  <View className="mt-4">
                    <VerificationButton
                      pharmacyId={p.id}
                      onVerify={onVerifyPress}
                      disabled={networkOffline}
                      disabledLabel="Connexion Internet requise pour vérifier."
                    />
                  </View>
                ) : null}
              </View>
            </ScrollView>

            {/* Bottom bar fixe — design Yably */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                paddingHorizontal: spacing.screenHorizontal,
                paddingTop: 10,
                paddingBottom: Math.max(insets.bottom, 20),
                backgroundColor: t.bg,
              }}
            >
              <View className="flex-row gap-2.5">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Appeler la pharmacie ${p.name}`}
                  onPress={openCall}
                  className="h-[52px] w-[52px] items-center justify-center rounded-2xl border"
                  style={{
                    borderColor: t.border,
                    borderWidth: 1.5,
                    backgroundColor: t.surface,
                  }}
                >
                  <Phone size={22} color={t.accent} strokeWidth={2} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Itinéraire vers ${p.name}, durée ${formatDuration(p.duration_min)}`}
                  onPress={pickDirections}
                  className="min-h-[52px] flex-1 overflow-hidden rounded-2xl"
                  style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
                >
                  <LinearGradient
                    colors={[...yablyOrangeGradient]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      flex: 1,
                      minHeight: 52,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      paddingHorizontal: 16,
                    }}
                  >
                    <Waypoints size={18} color="#FFFFFF" strokeWidth={2} />
                    <Text
                      className="text-[15px] font-bold text-white"
                      style={{ fontFamily: fonts.outfitBold }}
                    >
                      Itinéraire — {formatDuration(p.duration_min)}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>

            {toastVisible ? (
              <Animated.View
                entering={SlideInDown.springify().damping(16).stiffness(210)}
                exiting={FadeOut.duration(220)}
                className="absolute left-4 right-4 rounded-2xl px-4 py-3 shadow-lg"
                style={{
                  top: insets.top + 56,
                  backgroundColor: t.primary,
                }}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                <Animated.View entering={ZoomIn.delay(60).springify()}>
                  <Text
                    className="text-center text-[16px] font-bold text-white"
                    accessibilityLabel="Félicitations, plus cinq points gagnés"
                  >
                    🎉 +5 points !
                  </Text>
                </Animated.View>
              </Animated.View>
            ) : null}
          </>
        )}
      </View>
    </>
  );
}

export default function PharmacyDetailScreen() {
  return (
    <ScreenErrorBoundary>
      <PharmacyDetailScreenInner />
    </ScreenErrorBoundary>
  );
}
