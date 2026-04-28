import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import {
  Bell,
  CheckCircle,
  List,
  Map as MapIcon,
  MapPin,
  Moon,
  SlidersHorizontal,
  Sun,
  X,
  Zap,
} from 'lucide-react-native';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenErrorBoundary } from '@/components/common/ErrorBoundary';
import { GlassPanel } from '@/components/common/glassPanel';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { PulseDot } from '@/components/common/pulseDot';
import { UserAvatar } from '@/components/common/userAvatar';
import { YablyLogo } from '@/components/common/yablyLogo';
import { InsuranceFilter } from '@/components/pharmacy/InsuranceFilter';
import { PharmacyCard } from '@/components/pharmacy/PharmacyCard';
import { PharmacyListRow } from '@/components/pharmacy/PharmacyListRow';

const PharmacyMapLazy = lazy(async () => {
  const m = await import('@/components/pharmacy/PharmacyMap');
  return { default: m.PharmacyMap };
});
import { SearchBar } from '@/components/ui/SearchBar';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  formatGuardChangeBannerDate,
  getNextGuardChangeDate,
} from '@/lib/gardeSchedule';
import { getPharmacyVerificationTone } from '@/lib/pharmacyVerificationTone';
import { COTE_IVOIRE_COMMUNES, spacing, yablyOrangeGradient } from '@/lib/constants';
import { fonts } from '@/lib/fonts';
import { explorerGreetingLine } from '@/lib/greeting';
import { useLocation } from '@/hooks/useLocation';
import { useNightMode } from '@/hooks/useNightMode';
import { useOffline } from '@/hooks/useOffline';
import { usePharmacies } from '@/hooks/usePharmacies';
import { useRealtimeVerifications } from '@/hooks/useRealtimeVerifications';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import type { PharmacyDeGarde } from '@/types/pharmacy';

const GARDE_BANNER_STORAGE_KEY = '@pharmacie-garde/garde-banner-dismiss';

function HomeScreenInner() {
  const { theme: t, nightMode, toggleNightMode } = useNightMode();
  const {
    location,
    loading: locLoading,
    error: locError,
    refresh: refreshLocation,
    placeLabel: userPlaceLabel,
    coordsLabel: userCoordsLabel,
  } = useLocation();

  useRealtimeVerifications();

  const { isOffline: networkOffline, lastSyncDate: offlineMetaSync } =
    useOffline();
  const {
    filteredPharmacies,
    pharmacies,
    loading: pharmaLoading,
    isFetching: pharmaFetching,
    error: pharmaError,
    refetch,
    isOffline,
    lastSyncDate,
  } = usePharmacies(location?.latitude ?? null, location?.longitude ?? null);

  const showOfflineBanner =
    (networkOffline || isOffline) && pharmacies.length > 0;

  const searchQuery = usePharmacyStore((s) => s.searchQuery);
  const setSearchQuery = usePharmacyStore((s) => s.setSearchQuery);
  const communeFilter = usePharmacyStore((s) => s.communeFilter);
  const setCommuneFilter = usePharmacyStore((s) => s.setCommuneFilter);
  const insuranceFilter = usePharmacyStore((s) => s.insuranceFilter);
  const toggleInsuranceFilter = usePharmacyStore((s) => s.toggleInsuranceFilter);
  const resetFilters = usePharmacyStore((s) => s.resetFilters);

  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const unreadNotificationCount = useUIStore((s) => s.unreadNotificationCount);

  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [communeFilterSearch, setCommuneFilterSearch] = useState('');
  const [gardeBannerVisible, setGardeBannerVisible] = useState(true);
  const [greetingTick, setGreetingTick] = useState(0);

  const userId = useAuthStore((s) => s.userId);
  const profile = useAuthStore((s) => s.profile);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  useFocusEffect(
    useCallback(() => {
      if (userId !== null) {
        void fetchProfile();
      }
    }, [userId, fetchProfile]),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setGreetingTick((n) => n + 1);
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const greetingLine = useMemo(
    () => explorerGreetingLine(new Date(), profile?.display_name),
    [profile?.display_name, greetingTick],
  );

  const nextGuardChange = useMemo(() => getNextGuardChangeDate(), []);
  const guardBannerDismissId = useMemo(
    () => String(nextGuardChange.getTime()),
    [nextGuardChange],
  );

  useEffect(() => {
    void AsyncStorage.getItem(GARDE_BANNER_STORAGE_KEY).then((stored) => {
      if (stored === guardBannerDismissId) {
        setGardeBannerVisible(false);
      }
    });
  }, [guardBannerDismissId]);

  const dismissGardeBanner = useCallback(() => {
    setGardeBannerVisible(false);
    void AsyncStorage.setItem(GARDE_BANNER_STORAGE_KEY, guardBannerDismissId);
  }, [guardBannerDismissId]);

  const openVerifiedCount = useMemo(
    () =>
      filteredPharmacies.filter(
        (p) => getPharmacyVerificationTone(p) === 'verified',
      ).length,
    [filteredPharmacies],
  );

  const insuranceOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of pharmacies) {
      for (const ins of p.accepted_insurance) {
        set.add(ins);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [pharmacies]);

  const communeListFiltered = useMemo(() => {
    const q = communeFilterSearch.trim().toLowerCase();
    if (q.length === 0) {
      return [...COTE_IVOIRE_COMMUNES];
    }
    return COTE_IVOIRE_COMMUNES.filter((c) => c.toLowerCase().includes(q));
  }, [communeFilterSearch]);

  useEffect(() => {
    if (!filterModalVisible) {
      setCommuneFilterSearch('');
    }
  }, [filterModalVisible]);

  const onRefresh = useCallback(() => {
    void refreshLocation();
    void refetch();
  }, [refreshLocation, refetch]);

  const goPharmacy = useCallback((p: PharmacyDeGarde) => {
    router.push(`/pharmacy/${p.id}`);
  }, []);

  const showPharmaError =
    pharmaError !== null && pharmacies.length === 0 && !pharmaLoading;
  const showEmpty =
    !pharmaLoading &&
    !showPharmaError &&
    filteredPharmacies.length === 0 &&
    pharmacies.length > 0;
  const showEmptyAll =
    !pharmaLoading &&
    !showPharmaError &&
    pharmacies.length === 0 &&
    location !== null;

  const listLoading = pharmaLoading && pharmacies.length === 0;

  const renderPharmacyItem = useCallback<ListRenderItem<PharmacyDeGarde>>(
    ({ item, index }) => (
      <PharmacyListRow index={index}>
        <PharmacyCard pharmacy={item} onPress={goPharmacy} />
      </PharmacyListRow>
    ),
    [goPharmacy],
  );

  return (
    <View className="flex-1" style={{ backgroundColor: 'transparent' }}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {!nightMode ? (
          <>
            <LinearGradient
              colors={['rgba(229,145,58,0.14)', 'transparent']}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={{
                position: 'absolute',
                top: -40,
                right: -50,
                width: 280,
                height: 280,
                borderRadius: 140,
              }}
            />
            <LinearGradient
              colors={['rgba(13,124,95,0.08)', 'transparent']}
              start={{ x: 0.5, y: 1 }}
              end={{ x: 0.5, y: 0 }}
              style={{
                position: 'absolute',
                bottom: 120,
                left: -60,
                width: 240,
                height: 240,
                borderRadius: 120,
              }}
            />
          </>
        ) : (
          <LinearGradient
            colors={['rgba(46,234,173,0.07)', 'transparent']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: 'absolute',
              top: 20,
              right: -30,
              width: 220,
              height: 220,
              borderRadius: 110,
            }}
          />
        )}
      </View>
      <SafeAreaView className="flex-1" edges={['top']} style={{ backgroundColor: 'transparent' }}>
        <View style={{ paddingHorizontal: spacing.screenHorizontal }}>
          {/* En-tête accueil — verre + salutation + avatar */}
          <GlassPanel
            borderRadius={22}
            style={{ marginBottom: 10 }}
            contentStyle={{
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <View className="flex-row items-center justify-between gap-3">
              <View className="min-w-0 flex-1 flex-row items-center gap-3">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ouvrir le profil"
                  onPress={() => router.push('/(tabs)/profile')}
                  style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
                >
                  <UserAvatar avatarUrl={profile?.avatar_url} size={46} />
                </Pressable>
                
                <View className="min-w-0 flex-1 justify-center">
                  <Text
                    numberOfLines={1}
                    className="text-[18px] font-bold tracking-tight"
                    style={{ color: t.text, fontFamily: fonts.outfitBold }}
                  >
                    {greetingLine}
                  </Text>
                  
                  <View className="mt-1 flex-row items-center gap-1.5">
                    <MapPin size={12} color={t.primary} strokeWidth={2.5} />
                    <Text
                      numberOfLines={1}
                      className="flex-1 text-[12px]"
                      style={{ color: t.textSoft, fontFamily: fonts.outfitMedium }}
                    >
                      {locLoading && location === null
                        ? 'Localisation en cours…'
                        : location === null
                          ? locError ?? 'Position indisponible'
                          : userPlaceLabel && userPlaceLabel.length > 0
                            ? userPlaceLabel
                            : userCoordsLabel ?? 'Position actuelle'}
                    </Text>
                  </View>
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                <GlassPanel
                  borderRadius={14}
                  intensity={38}
                  contentStyle={{ flexDirection: 'row', padding: 4, gap: 4 }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      nightMode ? 'Activer le mode jour' : 'Activer le mode nuit'
                    }
                    hitSlop={6}
                    onPress={() => {
                      toggleNightMode();
                    }}
                    className="h-9 w-9 items-center justify-center rounded-[10px]"
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.72 : 1,
                      backgroundColor: nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.35)',
                    })}
                  >
                    {nightMode ? (
                      <Sun size={17} color={t.textSoft} strokeWidth={2} />
                    ) : (
                      <Moon size={17} color={t.textSoft} strokeWidth={2} />
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Notifications"
                    hitSlop={6}
                    onPress={() => {
                      router.push('/(tabs)/notifications');
                    }}
                    className="h-9 w-9 items-center justify-center rounded-[10px]"
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.72 : 1,
                      backgroundColor: nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.35)',
                    })}
                  >
                    <View>
                      <Bell size={17} color={t.textSoft} strokeWidth={2} />
                      {unreadNotificationCount > 0 ? (
                        <View
                          className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: t.danger,
                            borderWidth: 1.5,
                            borderColor: 'rgba(255,255,255,0.85)',
                          }}
                        />
                      ) : null}
                    </View>
                  </Pressable>
                </GlassPanel>
              </View>
            </View>
          </GlassPanel>

          {/* Recherche + filtres */}
          <GlassPanel
            borderRadius={18}
            style={{ marginBottom: 10 }}
            contentStyle={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 8,
              paddingHorizontal: 10,
            }}
          >
            <View className="min-w-0 flex-1">
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Rechercher une pharmacie…"
                variant="glass"
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Filtres"
              onPress={() => {
                setFilterModalVisible(true);
              }}
              className="h-11 w-11 items-center justify-center overflow-hidden rounded-[14px]"
              style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            >
              {nightMode ? (
                <LinearGradient
                  colors={[...yablyOrangeGradient]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: '100%',
                    height: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SlidersHorizontal size={17} color="#FFFFFF" strokeWidth={2} />
                </LinearGradient>
              ) : (
                <View
                  className="h-full w-full items-center justify-center"
                  style={{ backgroundColor: t.primary }}
                >
                  <SlidersHorizontal size={17} color="#FFFFFF" strokeWidth={2} />
                </View>
              )}
            </Pressable>
          </GlassPanel>

          {/* Segmented carte / liste */}
          <GlassPanel
            borderRadius={14}
            style={{ marginBottom: 2 }}
            contentStyle={{ padding: 4, flexDirection: 'row' }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Afficher la carte des pharmacies"
              accessibilityState={{ selected: viewMode === 'map' }}
              onPress={() => {
                setViewMode('map');
              }}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[9px] py-1.5"
              style={{
                backgroundColor:
                  viewMode === 'map'
                    ? nightMode
                      ? 'rgba(255,255,255,0.12)'
                      : 'rgba(255,255,255,0.52)'
                    : 'transparent',
                shadowColor: viewMode === 'map' ? '#000000' : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: viewMode === 'map' ? 0.08 : 0,
                shadowRadius: 6,
                elevation: viewMode === 'map' ? 2 : 0,
              }}
            >
              <MapIcon
                size={14}
                color={viewMode === 'map' ? t.accent : t.textMuted}
                strokeWidth={2}
              />
              <Text
                className="text-xs"
                style={{
                  color: viewMode === 'map' ? t.accent : t.textMuted,
                  fontFamily: viewMode === 'map' ? fonts.outfitBold : fonts.outfitMedium,
                  fontWeight: viewMode === 'map' ? '700' : '500',
                }}
              >
                Carte
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Afficher la liste des pharmacies"
              accessibilityState={{ selected: viewMode === 'list' }}
              onPress={() => {
                setViewMode('list');
              }}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[9px] py-1.5"
              style={{
                backgroundColor:
                  viewMode === 'list'
                    ? nightMode
                      ? 'rgba(255,255,255,0.12)'
                      : 'rgba(255,255,255,0.52)'
                    : 'transparent',
                shadowColor: viewMode === 'list' ? '#000000' : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: viewMode === 'list' ? 0.08 : 0,
                shadowRadius: 6,
                elevation: viewMode === 'list' ? 2 : 0,
              }}
            >
              <List
                size={14}
                color={viewMode === 'list' ? t.accent : t.textMuted}
                strokeWidth={2}
              />
              <Text
                className="text-xs"
                style={{
                  color: viewMode === 'list' ? t.accent : t.textMuted,
                  fontFamily: viewMode === 'list' ? fonts.outfitBold : fonts.outfitMedium,
                  fontWeight: viewMode === 'list' ? '700' : '500',
                }}
              >
                Liste
              </Text>
            </Pressable>
          </GlassPanel>

          {/* Bannière changement de garde (vue liste) */}
          {viewMode === 'list' && gardeBannerVisible ? (
            <GlassPanel
              borderRadius={14}
              style={{ marginTop: 10 }}
              contentStyle={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: nightMode
                  ? 'rgba(240,160,75,0.12)'
                  : 'rgba(229,145,58,0.14)',
              }}
            >
              <Zap size={15} color={t.accent} strokeWidth={2} />
              <Text
                className="min-w-0 flex-1 pl-2 text-[11px] font-semibold"
                style={{ color: t.text, fontFamily: fonts.outfitSemiBold }}
              >
                Prochain changement :{' '}
                <Text style={{ fontFamily: fonts.outfitBold }}>
                  {formatGuardChangeBannerDate(nextGuardChange)}
                </Text>
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fermer la bannière de changement de garde"
                hitSlop={8}
                onPress={dismissGardeBanner}
              >
                <X size={14} color={t.textMuted} strokeWidth={2} />
              </Pressable>
            </GlassPanel>
          ) : null}

          <OfflineBanner
            visible={showOfflineBanner}
            lastSyncDate={lastSyncDate ?? offlineMetaSync}
            onRetry={() => void refetch()}
          />

          {/* Erreur position */}
          {locError !== null ? (
            <View className="mt-2 rounded-[10px] px-3 py-2" style={{ backgroundColor: t.accentMuted }}>
              <Text style={{ color: t.text }}>{locError}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Actualiser la position GPS"
                onPress={() => void refreshLocation()}
                className="mt-2 self-start"
              >
                <Text className="text-[14px]" style={{ color: t.primary, fontWeight: '700' }}>
                  Actualiser la position
                </Text>
              </Pressable>
            </View>
          ) : null}

          {locLoading && location === null ? (
            <Text className="mt-2 text-[14px]" style={{ color: t.textSoft }}>
              Localisation en cours…
            </Text>
          ) : null}

          {!locLoading && location === null && locError === null ? (
            <View className="mt-2">
              <Text style={{ color: t.textSoft }}>
                Activez la localisation pour voir les pharmacies à proximité.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Demander l’accès à la position"
                onPress={() => void refreshLocation()}
                className="mt-2 self-start"
              >
                <Text className="text-[14px]" style={{ color: t.primary, fontWeight: '700' }}>
                  Demander la position
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Erreur chargement données */}
        {showPharmaError ? (
          <View
            className="mx-5 mt-4 flex-1 items-center justify-center rounded-[14px] border px-4 py-8"
            style={{ borderColor: t.border, backgroundColor: t.surface }}
          >
            <Text className="text-center text-[15px] font-semibold" style={{ color: t.danger }}>
              {pharmaError.message}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Réessayer de charger les pharmacies"
              onPress={() => void refetch()}
              className="mt-4 rounded-[14px] px-5 py-3"
              style={{ backgroundColor: t.primary }}
            >
              <Text className="text-[16px] font-bold text-white">Réessayer</Text>
            </Pressable>
          </View>
        ) : viewMode === 'map' ? (
          /* Carte : MapLibre natif (lazy + Suspense). */
          <View className="mt-2 min-h-[320px] flex-1">
            {pharmaLoading && pharmacies.length === 0 ? (
              <View
                className="flex-1 items-center justify-center py-12"
                style={{ backgroundColor: t.surfaceAlt }}
              >
                <Text style={{ color: t.textSoft, fontFamily: fonts.outfitRegular }}>
                  Chargement de la carte…
                </Text>
              </View>
            ) : (
              <>
                <GlassPanel
                  borderRadius={20}
                  style={{
                    marginHorizontal: spacing.screenHorizontal,
                    minHeight: 280,
                    flex: 1,
                  }}
                  contentStyle={{ padding: 0, flex: 1, minHeight: 280 }}
                >
                  <View style={{ flex: 1, minHeight: 280 }}>
                    <Suspense
                      fallback={
                        <View
                          className="min-h-[280px] flex-1 items-center justify-center py-12"
                          style={{ backgroundColor: t.surfaceAlt }}
                        >
                          <ActivityIndicator color={t.primary} size="large" />
                          <Text
                            className="mt-3 text-[14px]"
                            style={{ color: t.textSoft, fontFamily: fonts.outfitRegular }}
                          >
                            Chargement du module carte…
                          </Text>
                        </View>
                      }
                    >
                      <PharmacyMapLazy
                        pharmacies={filteredPharmacies}
                        userLocation={location}
                        onMarkerPress={goPharmacy}
                      />
                    </Suspense>
                  </View>
                </GlassPanel>
                {!showPharmaError && pharmacies.length > 0 ? (
                  <GlassPanel
                    borderRadius={16}
                    style={{ marginTop: 10, marginHorizontal: spacing.screenHorizontal }}
                    contentStyle={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      gap: 10,
                    }}
                  >
                    <View className="min-h-[44px] flex-1 flex-row items-center gap-2">
                      <PulseDot color={t.primary} size={8} />
                      <Text
                        className="text-xs font-bold"
                        style={{ color: t.primary, fontFamily: fonts.outfitBold }}
                      >
                        {filteredPharmacies.length} ouvertes
                      </Text>
                    </View>
                    <View
                      style={{
                        width: 1,
                        alignSelf: 'stretch',
                        opacity: 0.35,
                        backgroundColor: nightMode ? '#ffffff' : '#1B1F23',
                      }}
                    />
                    <View className="min-h-[44px] flex-1 flex-row items-center gap-2">
                      <CheckCircle size={14} color={t.accent} strokeWidth={2.2} />
                      <Text
                        className="text-xs font-bold"
                        style={{ color: t.accent, fontFamily: fonts.outfitBold }}
                      >
                        {openVerifiedCount} vérifiées
                      </Text>
                    </View>
                  </GlassPanel>
                ) : null}
              </>
            )}
          </View>
        ) : (
          <FlashList
            data={filteredPharmacies}
            drawDistance={250}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: spacing.screenHorizontal,
              paddingTop: 8,
              paddingBottom: 28,
              flexGrow: 1,
            }}
            refreshControl={
              <RefreshControl
                refreshing={pharmaFetching && pharmacies.length > 0}
                onRefresh={onRefresh}
              />
            }
            ListHeaderComponent={
              <View className="pb-1">
                {listLoading ? (
                  <View className="gap-2 pb-2">
                    <Skeleton width="100%" height={120} borderRadius={20} />
                    <Skeleton width="100%" height={120} borderRadius={20} />
                    <Skeleton width="100%" height={120} borderRadius={20} />
                  </View>
                ) : (
                  <Text
                    className="pb-2 text-[11px] font-semibold"
                    style={{ color: t.textMuted, fontFamily: fonts.outfitSemiBold }}
                  >
                    Triées par distance • {filteredPharmacies.length} résultat
                    {filteredPharmacies.length > 1 ? 's' : ''}
                  </Text>
                )}
              </View>
            }
            renderItem={renderPharmacyItem}
            ListEmptyComponent={
              listLoading ? null : showEmpty || showEmptyAll ? (
                <View className="items-center py-10">
                  <Text className="text-center text-[15px] font-semibold" style={{ color: t.textSoft }}>
                    {showEmpty
                      ? 'Aucune pharmacie ne correspond aux filtres.'
                      : 'Aucune pharmacie de garde trouvée pour votre position.'}
                  </Text>
                  {showEmpty ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Réinitialiser tous les filtres"
                      onPress={resetFilters}
                      className="mt-3"
                    >
                      <Text className="text-[14px]" style={{ color: t.primary, fontWeight: '700' }}>
                        Réinitialiser les filtres
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null
            }
          />
        )}
      </SafeAreaView>

      {/* Modale filtres (commune + assurances) */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setFilterModalVisible(false);
        }}
      >
        <SafeAreaView className="flex-1" style={{ backgroundColor: t.bg }} edges={['top']}>
          <View
            className="flex-row items-center justify-between border-b px-4 py-3"
            style={{ borderColor: t.border }}
          >
            <Text className="text-[18px] font-bold" style={{ color: t.text }}>
              Filtres
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer les filtres"
              onPress={() => setFilterModalVisible(false)}
              hitSlop={12}
            >
              <X size={26} color={t.text} />
            </Pressable>
          </View>
          <FlatList
            className="flex-1 px-4 py-4"
            data={communeListFiltered}
            keyExtractor={(item) => item}
            extraData={communeFilter}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 40 }}
            ListHeaderComponent={
              <View>
                <Text
                  className="mb-2 text-[14px] font-semibold uppercase"
                  style={{ color: t.textSoft }}
                >
                  Commune
                </Text>
                <View className="mb-3 flex-row flex-wrap gap-2">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Filtrer par toutes les communes"
                    onPress={() => {
                      setCommuneFilter(null);
                    }}
                    className="rounded-full border px-3 py-2"
                    style={{
                      borderColor: communeFilter === null ? t.primary : t.border,
                      backgroundColor:
                        communeFilter === null ? t.primaryMuted : t.surface,
                    }}
                  >
                    <Text
                      style={{
                        color: communeFilter === null ? t.primary : t.text,
                        fontWeight: '600',
                      }}
                    >
                      Toutes
                    </Text>
                  </Pressable>
                </View>
                <TextInput
                  accessibilityLabel="Rechercher une commune pour le filtre"
                  placeholder="Rechercher une commune…"
                  placeholderTextColor={t.textMuted}
                  value={communeFilterSearch}
                  onChangeText={setCommuneFilterSearch}
                  className="mb-3 rounded-[14px] border px-4 py-3 text-[15px]"
                  style={{
                    borderColor: t.border,
                    color: t.text,
                    backgroundColor: t.surfaceAlt,
                  }}
                />
                {communeListFiltered.length === 0 ? (
                  <Text className="mb-3 text-[14px]" style={{ color: t.textSoft }}>
                    Aucune commune ne correspond à votre recherche.
                  </Text>
                ) : null}
              </View>
            }
            renderItem={({ item: c }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Filtrer par la commune ${c}`}
                onPress={() => {
                  setCommuneFilter(c);
                }}
                className="mb-2 rounded-[14px] border px-4 py-3"
                style={{
                  borderColor: communeFilter === c ? t.primary : t.border,
                  backgroundColor: communeFilter === c ? t.primaryMuted : t.surface,
                }}
              >
                <Text
                  style={{
                    color: communeFilter === c ? t.primary : t.text,
                    fontWeight: '600',
                  }}
                >
                  {c}
                </Text>
              </Pressable>
            )}
            ListFooterComponent={
              <View className="mt-2">
                <Text
                  className="mb-2 text-[14px] font-semibold uppercase"
                  style={{ color: t.textSoft }}
                >
                  Mutuelles / assurances
                </Text>
                {insuranceOptions.length > 0 ? (
                  <InsuranceFilter
                    options={insuranceOptions}
                    selected={insuranceFilter}
                    onToggle={toggleInsuranceFilter}
                  />
                ) : (
                  <Text style={{ color: t.textSoft }}>
                    Aucune donnée chargée pour filtrer.
                  </Text>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Réinitialiser tous les filtres et la recherche"
                  onPress={() => {
                    resetFilters();
                  }}
                  className="mt-6 items-center rounded-[14px] border py-3"
                  style={{ borderColor: t.border }}
                >
                  <Text className="text-[14px]" style={{ color: t.danger, fontWeight: '700' }}>
                    Réinitialiser tout
                  </Text>
                </Pressable>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <ScreenErrorBoundary>
      <HomeScreenInner />
    </ScreenErrorBoundary>
  );
}
