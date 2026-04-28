import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ExpoLinking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Clock,
  Phone,
  Share2,
  User,
  Waypoints,
  MapPin,
  Star,
  Navigation,
  Check,
  Trophy,
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

  const openCall = useCallback(async () => {
    if (p === null) return;
    track('call_button_tapped', { pharmacy_id: p.id });
    try {
      const url = telHref(p.phone_primary);
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Appel non supporté', "Cet appareil ne peut pas passer d'appels téléphoniques.");
      }
    } catch (e) {
      Alert.alert('Erreur', "Impossible de lancer l'appel.");
    }
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
      <View className="flex-1" style={{ backgroundColor: t.bg }}>
        {/* Header plat et épuré */}
        <View
          className="flex-row items-center justify-between px-4 pb-3 pt-2"
          style={{
            paddingTop: insets.top + 4,
            backgroundColor: t.bg,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retour"
            hitSlop={12}
            onPress={() => router.back()}
            className="h-[40px] w-[40px] items-center justify-center rounded-xl"
          >
            <ChevronLeft size={24} color={t.text} strokeWidth={2} />
          </Pressable>
          <Text
            className="flex-1 text-center text-[17px] font-bold"
            style={{ color: t.text, fontFamily: fonts.outfitBold }}
          >
            Détails de la pharmacie
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Partager cette pharmacie"
            hitSlop={12}
            onPress={() => void sharePharmacy()}
            className="h-[40px] w-[40px] items-center justify-center rounded-xl"
          >
            <Share2 size={20} color={t.text} strokeWidth={2} />
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
              className="mt-4 rounded-xl px-5 py-3"
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
                paddingTop: 20,
                paddingHorizontal: spacing.screenHorizontal,
                paddingBottom: 140 + insets.bottom,
              }}
              showsVerticalScrollIndicator={false}
            >
              {p.photo_url !== null && p.photo_url.length > 0 ? (
                <Image
                  source={{ uri: p.photo_url }}
                  recyclingKey={p.id}
                  style={{
                    width: '100%',
                    height: 200,
                    borderRadius: 16,
                    marginBottom: 16,
                  }}
                  contentFit="cover"
                  placeholderContentFit="cover"
                  cachePolicy="memory-disk"
                  accessibilityLabel={`Photo de la pharmacie ${p.name}`}
                  placeholder={{ blurhash: 'L5H2EC=PM+yV0g-mq.wG9c010J}I' }}
                />
              ) : null}

              {/* Carte principale identique à PharmacyCard */}
              <Card style={{ padding: 16, gap: 12 }}>
                {/* En-tête : Nom et Distance */}
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text
                      className="text-[18px] leading-6 tracking-tight"
                      style={{ color: t.text, fontFamily: fonts.outfitBold, fontWeight: '800' }}
                    >
                      {p.name}
                    </Text>
                  </View>
                  <View 
                    className="items-center justify-center rounded-[12px] px-2.5 py-1" 
                    style={{ backgroundColor: t.accentMuted }}
                  >
                    <Text style={{ fontFamily: fonts.outfitExtraBold, color: t.accent }}>
                      <Text className="text-[18px]">{formatDistance(p.distance_km).split(' ')[0]}</Text>
                      <Text
                        className="text-[11px]"
                        style={{ color: t.accent, fontFamily: fonts.outfitSemiBold }}
                      >
                        {' '}
                        {formatDistance(p.distance_km).split(' ')[1] ?? 'km'}
                      </Text>
                    </Text>
                  </View>
                </View>

                {/* Adresse et badges */}
                <View className="gap-3">
                  <View className="flex-row items-start gap-2 pr-2">
                    <MapPin size={15} color={t.textMuted} style={{ marginTop: 1 }} />
                    <View className="flex-1">
                      <Text
                        className="text-[14px] leading-5"
                        style={{ color: t.textSoft, fontFamily: fonts.outfitMedium }}
                      >
                        {p.address}
                      </Text>
                      {p.commune.length > 0 || p.city.length > 0 ? (
                        <Text
                          className="mt-0.5 text-[12px]"
                          style={{ color: t.textMuted, fontFamily: fonts.outfitRegular }}
                        >
                          {[p.commune, p.city].filter((s) => s.length > 0).join(' · ')}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View className="flex-row flex-wrap gap-2.5">
                    <WaitTimeChip minutes={p.avg_wait_time} dense />
                    <VerifiedBadge
                      verificationCount={p.verification_count}
                      lastVerification={p.last_verification}
                      lastStatus={p.last_verification_status}
                      variant="compact"
                    />
                    {p.last_verification_status === 'closed' ? (
                      <Badge label="Fermeture signalée" variant="danger" />
                    ) : (
                      <Badge label="Ouvert" variant="success" />
                    )}
                  </View>
                </View>

                {/* Pied de carte : Notes, Temps de trajet et Assurances */}
                <View
                  className="mt-1 flex-row flex-wrap items-center justify-between border-t pt-3 gap-y-3"
                  style={{ borderTopColor: t.border }}
                >
                  <View className="flex-row items-center gap-4">
                    <View className="flex-row items-center gap-1">
                      <Star size={16} color="#F59E0B" fill="#F59E0B" strokeWidth={0} />
                      <Text
                        className="text-[14px] tabular-nums"
                        style={{ color: t.text, fontFamily: fonts.outfitBold }}
                      >
                        {p.rating.toFixed(1)}
                      </Text>
                      <Text
                        className="text-[12px] tabular-nums"
                        style={{ color: t.textMuted, fontFamily: fonts.outfitRegular }}
                      >
                        ({p.review_count})
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      <Clock size={14} color={t.textMuted} strokeWidth={2} />
                      <Text
                        className="text-[13px] tabular-nums"
                        style={{ color: t.textMuted, fontFamily: fonts.outfitMedium }}
                      >
                        {formatDuration(p.duration_min)}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row flex-wrap items-center justify-end gap-1.5 max-w-[50%]">
                    {p.accepted_insurance.length === 0 ? (
                      <Text style={{ color: t.textMuted, fontFamily: fonts.outfitRegular, fontSize: 11 }}>
                        Non renseigné
                      </Text>
                    ) : (
                      p.accepted_insurance.map((code) => (
                        <View
                          key={code}
                          className="border px-2 py-0.5"
                          style={{
                            borderColor: t.border,
                            backgroundColor: t.surfaceAlt,
                            borderRadius: 8,
                          }}
                        >
                          <Text
                            className="text-[11px]"
                            style={{ color: t.textSoft, fontFamily: fonts.outfitSemiBold }}
                          >
                            {code}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              </Card>

              {/* Horaires */}
              <View className="mt-6 mb-6 rounded-xl border p-4" style={{ borderColor: t.border, backgroundColor: t.surface }}>
                <View className="flex-row items-center gap-2 mb-2">
                  <Clock size={18} color={t.text} />
                  <Text className="text-[15px] font-bold" style={{ color: t.text, fontFamily: fonts.outfitBold }}>
                    Horaires de garde
                  </Text>
                </View>
                <Text className="text-[14px] leading-5" style={{ color: t.textSoft, fontFamily: fonts.outfitRegular }}>
                  {horaireLabel}
                </Text>
              </View>

              {/* Vérification communautaire - Minimaliste */}
              <View 
                className="mb-8 rounded-xl border p-5" 
                style={{ borderColor: t.border, backgroundColor: t.surface }}
              >
                <Text
                  className="text-[15px] font-bold"
                  style={{ color: t.text, fontFamily: fonts.outfitBold }}
                >
                  Vérification communautaire
                </Text>
                <Text
                  className="mt-2 text-[14px] leading-5"
                  style={{ color: t.textSoft, fontFamily: fonts.outfitRegular }}
                >
                  {p.verification_count} personne{p.verification_count > 1 ? 's' : ''}{' '}
                  {p.verification_count > 1 ? 'ont' : 'a'} confirmé l’ouverture récemment. Aidez les autres en confirmant.
                </Text>

                {!authLoading && !isAuthenticated ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Se connecter pour vérifier"
                    className="mt-5 rounded-lg py-3"
                    style={{ backgroundColor: t.primary }}
                    onPress={() =>
                      router.push({
                        pathname: '/auth/login',
                        params: { returnTo: `/pharmacy/${pharmacyId}` },
                      })
                    }
                  >
                    <Text
                      className="text-center text-[15px] font-bold text-white"
                      style={{ fontFamily: fonts.outfitBold }}
                    >
                      Se connecter pour vérifier
                    </Text>
                  </Pressable>
                ) : null}

                {isAuthenticated && alreadyVerified ? (
                  <View
                    className="mt-5 flex-row items-center justify-center gap-2 rounded-lg border py-3"
                    style={{ borderColor: t.border, backgroundColor: t.bg }}
                  >
                    <Check size={18} color={t.text} />
                    <Text className="text-[14px] font-bold" style={{ color: t.text, fontFamily: fonts.outfitBold }}>
                      Vous avez vérifié récemment
                    </Text>
                  </View>
                ) : null}

                {isAuthenticated && !alreadyVerified && lat === null ? (
                  <Text className="mt-4 text-[13px]" style={{ color: t.textSoft }}>
                    Activez la position pour vérifier.
                  </Text>
                ) : null}

                {isAuthenticated && !alreadyVerified && lat !== null && tooFar ? (
                  <View className="mt-4">
                    <VerificationButton
                      pharmacyId={p.id}
                      onVerify={onVerifyPress}
                      disabled
                      disabledLabel={`Rapprochez-vous (${distanceMeters ?? '?'} m, max 500 m).`}
                    />
                  </View>
                ) : null}

                {isAuthenticated && !alreadyVerified && lat !== null && !tooFar ? (
                  <View className="mt-5">
                    <VerificationButton
                      pharmacyId={p.id}
                      onVerify={onVerifyPress}
                      disabled={networkOffline}
                      disabledLabel="Connexion Internet requise."
                    />
                  </View>
                ) : null}
              </View>
            </ScrollView>

            {/* Bottom bar plat */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: t.bg,
                borderTopWidth: 1,
                borderTopColor: t.border,
                paddingHorizontal: spacing.screenHorizontal,
                paddingTop: 16,
                paddingBottom: Math.max(insets.bottom, 20),
              }}
            >
              <View className="flex-row gap-3">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Appeler la pharmacie ${p.name}`}
                  onPress={openCall}
                  className="h-[52px] w-[52px] items-center justify-center rounded-xl border"
                  style={{
                    borderColor: t.border,
                    backgroundColor: t.surface,
                  }}
                >
                  <Phone size={22} color={t.text} strokeWidth={2} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Itinéraire vers ${p.name}, durée ${formatDuration(p.duration_min)}`}
                  onPress={pickDirections}
                  className="min-h-[52px] flex-1 overflow-hidden rounded-xl"
                  style={({ pressed }) => ({ 
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <LinearGradient
                    colors={[...yablyOrangeGradient]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      paddingHorizontal: 16,
                    }}
                  >
                    <Waypoints size={18} color="#FFFFFF" strokeWidth={2} />
                    <Text
                      className="text-[16px] font-bold text-white"
                      style={{ fontFamily: fonts.outfitBold }}
                    >
                      Y aller ({formatDuration(p.duration_min)})
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>

            {toastVisible ? (
              <Animated.View
                entering={SlideInDown.springify().damping(16).stiffness(210)}
                exiting={FadeOut.duration(220)}
                className="absolute left-4 right-4 rounded-xl px-4 py-3 shadow-sm flex-row items-center gap-3"
                style={{
                  top: insets.top + 56,
                  backgroundColor: t.surface,
                  borderWidth: 1,
                  borderColor: t.border,
                }}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                <Trophy size={20} color={t.primary} />
                <Animated.View entering={ZoomIn.delay(60).springify()}>
                  <Text
                    className="text-[15px] font-bold"
                    style={{ color: t.text, fontFamily: fonts.outfitBold }}
                    accessibilityLabel="Félicitations, plus cinq points gagnés"
                  >
                    +5 points !
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
