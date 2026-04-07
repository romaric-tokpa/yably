import {
  useFocusEffect,
  router,
} from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Award,
  Bell,
  CheckCircle,
  ChevronRight,
  Info,
  LogOut,
  MapPin,
  Moon,
  Shield,
  User,
} from 'lucide-react-native';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAppTheme } from '@/components/common/appThemeContext';
import { YablyLogo } from '@/components/common/yablyLogo';
import { useAuthSession } from '@/hooks/useAuthSession';
import { COTE_IVOIRE_COMMUNES, spacing, yablyOrangeGradient } from '@/lib/constants';
import { fonts } from '@/lib/fonts';
import { getProgressToNextBadge } from '@/lib/gamification';
import {
  firstNameFromDisplayName,
  lastNameFromDisplayName,
} from '@/lib/greeting';
import { formatProfilePhone } from '@/lib/format';
import { logger } from '@/lib/logger';
import { useAuthStore } from '@/stores/authStore';

function ProfileMenuRow(props: {
  iconName: 'check' | 'pin' | 'moon' | 'bell' | 'shield' | 'info';
  label: string;
  sub?: string | null;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
  isLast?: boolean;
}): ReactElement {
  const { theme: t } = useAppTheme();
  const { iconName, label, sub, onPress, right, danger, isLast } = props;

  const iconEl = (() => {
    const wrap = (node: ReactNode): ReactNode => (
      <View
        className="h-9 w-9 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: t.surfaceAlt }}
      >
        {node}
      </View>
    );
    const c = danger ? t.danger : t.accent;
    switch (iconName) {
      case 'check':
        return wrap(<CheckCircle size={18} color={c} strokeWidth={2} />);
      case 'pin':
        return wrap(<MapPin size={18} color={c} strokeWidth={2} />);
      case 'moon':
        return wrap(<Moon size={18} color={c} strokeWidth={2} />);
      case 'bell':
        return wrap(<Bell size={18} color={c} strokeWidth={2} />);
      case 'shield':
        return wrap(<Shield size={18} color={c} strokeWidth={2} />);
      default:
        return wrap(<Info size={18} color={c} strokeWidth={2} />);
    }
  })();

  const content = (
    <View
      className="flex-row items-center gap-3 px-4 py-3"
      style={{
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: t.border,
      }}
    >
      {iconEl}
      <View className="min-w-0 flex-1">
        <Text
          className="text-[13px] font-semibold"
          style={{
            color: danger ? t.danger : t.text,
            fontFamily: fonts.outfitSemiBold,
          }}
          numberOfLines={2}
        >
          {label}
        </Text>
        {sub !== undefined && sub !== null && sub.length > 0 ? (
          <Text
            className="mt-0.5 text-[11px]"
            style={{ color: t.textMuted, fontFamily: fonts.outfitRegular }}
            numberOfLines={2}
          >
            {sub}
          </Text>
        ) : null}
      </View>
      {right ?? <ChevronRight size={16} color={t.textMuted} />}
    </View>
  );

  if (onPress !== undefined) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress}>
        {content}
      </Pressable>
    );
  }
  return content;
}

function ProfileScreenInner() {
  const { theme: t, nightMode, toggleNightMode } = useAppTheme();
  const { userId, isLoading: authLoading } = useAuthSession();
  const profile = useAuthStore((s) => s.profile);
  const registrationMeta = useAuthStore((s) => s.registrationMeta);
  const profileLoading = useAuthStore((s) => s.profileLoading);
  const profileError = useAuthStore((s) => s.profileError);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const signOut = useAuthStore((s) => s.signOut);

  const [communeModalVisible, setCommuneModalVisible] = useState(false);
  const [communeSearch, setCommuneSearch] = useState('');
  const [notifBusy, setNotifBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (userId !== null) {
        void fetchProfile();
      }
    }, [userId, fetchProfile]),
  );

  const onSignOut = (): void => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await signOut();
            } catch (e) {
              logger.error('signOut profile', e);
              Alert.alert(
                'Erreur',
                e instanceof Error ? e.message : 'Déconnexion impossible.',
              );
            }
          })();
        },
      },
    ]);
  };

  const onToggleNotifications = async (value: boolean): Promise<void> => {
    if (profile === null) return;
    setNotifBusy(true);
    try {
      await updateProfile({ notification_enabled: value });
    } catch (e) {
      logger.error('notification toggle', e);
      Alert.alert(
        'Erreur',
        e instanceof Error
          ? e.message
          : 'Impossible de mettre à jour les notifications.',
      );
    } finally {
      setNotifBusy(false);
    }
  };

  const communesFiltered = useMemo(() => {
    const q = communeSearch.trim().toLowerCase();
    if (q.length === 0) {
      return [...COTE_IVOIRE_COMMUNES];
    }
    return COTE_IVOIRE_COMMUNES.filter((c) => c.toLowerCase().includes(q));
  }, [communeSearch]);

  useEffect(() => {
    if (!communeModalVisible) {
      setCommuneSearch('');
    }
  }, [communeModalVisible]);

  const pickCommune = async (commune: string | null): Promise<void> => {
    setCommuneModalVisible(false);
    setCommuneSearch('');
    try {
      await updateProfile({
        preferred_commune: commune === null || commune === '' ? null : commune,
      });
    } catch (e) {
      logger.error('preferred_commune', e);
      Alert.alert(
        'Erreur',
        e instanceof Error ? e.message : 'Mise à jour impossible.',
      );
    }
  };

  if (!authLoading && userId === null) {
    return (
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: t.bg }}
        edges={['left', 'right']}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: spacing.screenHorizontal,
            paddingTop: 24,
            paddingBottom: 32,
            justifyContent: 'center',
          }}
        >
          <View className="items-center">
            <YablyLogo size={48} color={t.accent} fillOpacity={0.12} strokeWidth={2.2} />
          </View>
          <Text
            className="mt-6 text-center text-[18px] font-bold leading-7"
            style={{ color: t.text, fontFamily: fonts.outfitBold }}
          >
            Connectez-vous pour accéder à votre profil
          </Text>
          <Text
            className="mt-3 text-center text-[13px] leading-5"
            style={{ color: t.textSoft, fontFamily: fonts.outfitRegular }}
          >
            La consultation des pharmacies de garde ne nécessite pas de compte.
          </Text>
          <Pressable
            accessibilityRole="button"
            className="mt-8 self-center overflow-hidden rounded-2xl"
            onPress={() =>
              router.push({
                pathname: '/auth/login',
                params: { returnTo: '/(tabs)/profile' },
              })
            }
          >
            <LinearGradient
              colors={[...yablyOrangeGradient]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingHorizontal: 32, paddingVertical: 16 }}
            >
              <Text
                className="text-center text-[16px] font-bold text-white"
                style={{ fontFamily: fonts.outfitBold }}
              >
                Se connecter
              </Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
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
        <Text className="mt-3" style={{ color: t.textSoft }}>
          Chargement du profil…
        </Text>
      </SafeAreaView>
    );
  }

  if (userId !== null && !profileLoading && profile === null) {
    return (
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: t.bg }}
        edges={['left', 'right']}
      >
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center" style={{ color: t.danger }}>
            {profileError ?? 'Profil introuvable.'}
          </Text>
          <Pressable
            className="mt-6 rounded-[14px] px-6 py-3"
            style={{ backgroundColor: t.primary }}
            onPress={() => void fetchProfile()}
          >
            <Text className="font-bold text-white">Réessayer</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (profile === null || userId === null) {
    return null;
  }

  const displayNameRaw = profile.display_name?.trim();

  const profileFirstName =
    registrationMeta !== null && registrationMeta.firstName.length > 0
      ? registrationMeta.firstName
      : firstNameFromDisplayName(profile.display_name);
  const profileLastName =
    registrationMeta !== null && registrationMeta.lastName.length > 0
      ? registrationMeta.lastName
      : lastNameFromDisplayName(profile.display_name);

  const nameFromParts = [profileFirstName, profileLastName]
    .filter((p) => p.length > 0)
    .join(' ')
    .trim();
  const cardUserTitle =
    nameFromParts.length > 0
      ? nameFromParts
      : displayNameRaw !== undefined && displayNameRaw.length > 0
        ? displayNameRaw
        : 'Utilisateur';
  const emailFromRow = profile.email?.trim() ?? '';
  const profileEmail =
    emailFromRow.length > 0
      ? emailFromRow
      : registrationMeta !== null && registrationMeta.email.length > 0
        ? registrationMeta.email
        : '';

  const emptyField = '—';

  const points = profile.points;
  const badgeProgress = getProgressToNextBadge(points);
  const nextLabel =
    badgeProgress.next !== null
      ? `${badgeProgress.next.minPoints - points} pts avant « ${badgeProgress.next.name} »`
      : 'Niveau maximum atteint';

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: t.bg }}
      edges={['left', 'right']}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.screenHorizontal,
          paddingTop: 8,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="pb-4 text-xl font-extrabold"
          style={{ color: t.text, fontFamily: fonts.outfitExtraBold }}
        >
          Mon profil
        </Text>

        <View
          className="mb-3 flex-row items-center gap-3.5 rounded-[20px] border p-4"
          style={{ borderColor: t.border, backgroundColor: t.surface }}
        >
          <LinearGradient
            colors={[...yablyOrangeGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={26} color="#FFFFFF" strokeWidth={2} />
          </LinearGradient>
          <View className="min-w-0 flex-1">
            <Text
              className="text-[17px] font-extrabold"
              style={{ color: t.text, fontFamily: fonts.outfitExtraBold }}
              numberOfLines={1}
            >
              {cardUserTitle}
            </Text>
            <Text
              className="mt-0.5 text-xs"
              style={{ color: t.textSoft, fontFamily: fonts.outfitRegular }}
              numberOfLines={1}
            >
              {formatProfilePhone(profile.phone)}
            </Text>
          </View>
        </View>

        <LinearGradient
          colors={[...yablyOrangeGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 20,
            padding: 18,
            marginBottom: 12,
          }}
        >
          <View className="mb-3 flex-row items-center justify-between">
            <View>
              <Text
                className="text-xs font-semibold"
                style={{
                  color: 'rgba(255,255,255,0.65)',
                  fontFamily: fonts.outfitSemiBold,
                }}
              >
                Mes points
              </Text>
              <Text
                className="mt-0.5 text-[32px] font-black text-white"
                style={{ fontFamily: fonts.nunitoBlack }}
              >
                {points}
              </Text>
            </View>
            <View
              className="flex-row items-center gap-1.5 rounded-xl px-3.5 py-1.5"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <Award size={16} color="#FFFFFF" strokeWidth={2} />
              <Text
                className="text-xs font-bold text-white"
                style={{ fontFamily: fonts.outfitBold }}
              >
                {badgeProgress.current.name}
              </Text>
            </View>
          </View>
          <View
            className="mb-1 h-1 overflow-hidden rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <View
              className="h-full rounded-full bg-white"
              style={{ width: `${Math.round(badgeProgress.progress * 100)}%` }}
            />
          </View>
          <Text
            className="text-[10px]"
            style={{ color: 'rgba(255,255,255,0.55)', fontFamily: fonts.outfitRegular }}
          >
            {nextLabel}
          </Text>
        </LinearGradient>

        <View
          className="mb-3 overflow-hidden rounded-[18px] border p-4"
          style={{ borderColor: t.border, backgroundColor: t.surface }}
        >
          <View className="mb-3 flex-row items-center justify-between gap-2">
            <Text
              className="flex-1 text-[11px] font-bold uppercase tracking-wide"
              style={{ color: t.textMuted, fontFamily: fonts.outfitBold }}
            >
              Informations du compte
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Modifier les informations du compte"
              onPress={() => router.push('/profile/edit-account')}
              hitSlop={8}
              className="rounded-lg px-2 py-1"
            >
              <Text
                className="text-[12px] font-bold"
                style={{ color: t.primary, fontFamily: fonts.outfitBold }}
              >
                Modifier
              </Text>
            </Pressable>
          </View>
          <View className="gap-3">
            <View>
              <Text
                className="text-[11px] font-semibold"
                style={{ color: t.textMuted, fontFamily: fonts.outfitSemiBold }}
              >
                Prénom
              </Text>
              <Text
                className="mt-0.5 text-[15px] font-semibold"
                style={{ color: t.text, fontFamily: fonts.outfitSemiBold }}
              >
                {profileFirstName.length > 0 ? profileFirstName : emptyField}
              </Text>
            </View>
            <View>
              <Text
                className="text-[11px] font-semibold"
                style={{ color: t.textMuted, fontFamily: fonts.outfitSemiBold }}
              >
                Nom
              </Text>
              <Text
                className="mt-0.5 text-[15px] font-semibold"
                style={{ color: t.text, fontFamily: fonts.outfitSemiBold }}
              >
                {profileLastName.length > 0 ? profileLastName : emptyField}
              </Text>
            </View>
            <View>
              <Text
                className="text-[11px] font-semibold"
                style={{ color: t.textMuted, fontFamily: fonts.outfitSemiBold }}
              >
                E-mail
              </Text>
              <Text
                className="mt-0.5 text-[15px] font-semibold"
                style={{ color: t.text, fontFamily: fonts.outfitSemiBold }}
              >
                {profileEmail.length > 0 ? profileEmail : emptyField}
              </Text>
            </View>
            <View>
              <Text
                className="text-[11px] font-semibold"
                style={{ color: t.textMuted, fontFamily: fonts.outfitSemiBold }}
              >
                Téléphone
              </Text>
              <Text
                className="mt-0.5 text-[15px] font-semibold"
                style={{ color: t.text, fontFamily: fonts.outfitSemiBold }}
              >
                {formatProfilePhone(profile.phone)}
              </Text>
            </View>
          </View>
        </View>

        <View
          className="overflow-hidden rounded-[18px] border"
          style={{ borderColor: t.border, backgroundColor: t.surface }}
        >
          <ProfileMenuRow
            iconName="check"
            label="Mes vérifications"
            sub="Historique complet"
            onPress={() => router.push('/profile/verifications')}
          />
          <ProfileMenuRow
            iconName="pin"
            label="Commune préférée"
            sub={profile.preferred_commune ?? 'Toute la Côte d’Ivoire'}
            onPress={() => setCommuneModalVisible(true)}
          />
          <ProfileMenuRow
            iconName="moon"
            label="Mode nuit"
            sub={nightMode ? 'Activé' : 'Désactivé'}
            right={
              <Switch
                accessibilityLabel="Mode nuit"
                value={nightMode}
                onValueChange={() => toggleNightMode()}
                trackColor={{ false: t.border, true: t.primaryMuted }}
                thumbColor={nightMode ? t.primary : t.textMuted}
              />
            }
          />
          <ProfileMenuRow
            iconName="bell"
            label="Notifications"
            sub={profile.notification_enabled ? 'Activées' : 'Désactivées'}
            right={
              <Switch
                accessibilityLabel="Notifications activées"
                value={profile.notification_enabled}
                disabled={notifBusy}
                onValueChange={(v) => void onToggleNotifications(v)}
                trackColor={{ false: t.border, true: t.primaryMuted }}
                thumbColor={
                  profile.notification_enabled ? t.primary : t.textMuted
                }
              />
            }
          />
          <ProfileMenuRow
            iconName="shield"
            label="Confidentialité"
            onPress={() => router.push('/profile/about')}
          />
          <ProfileMenuRow
            iconName="info"
            label="À propos de Yably"
            onPress={() => router.push('/profile/about')}
            isLast
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Se déconnecter"
          onPress={onSignOut}
          className="mt-3 flex-row items-center justify-center gap-2 rounded-[14px] border py-3.5"
          style={{
            borderColor: 'rgba(217,68,82,0.15)',
            backgroundColor: 'rgba(217,68,82,0.04)',
          }}
        >
          <LogOut size={16} color={t.danger} strokeWidth={2} />
          <Text
            className="text-[13px] font-bold"
            style={{ color: t.danger, fontFamily: fonts.outfitBold }}
          >
            Se déconnecter
          </Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={communeModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCommuneModalVisible(false)}
      >
        <SafeAreaView
          className="flex-1"
          style={{ backgroundColor: t.surface }}
          edges={['top', 'left', 'right']}
        >
          <View
            className="flex-row items-center justify-between border-b px-4 py-3"
            style={{ borderBottomColor: t.border }}
          >
            <Text className="text-lg font-bold" style={{ color: t.text }}>
              Commune préférée
            </Text>
            <Pressable onPress={() => setCommuneModalVisible(false)} hitSlop={12}>
              <Text className="font-semibold" style={{ color: t.primary }}>
                Fermer
              </Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{ padding: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            <TextInput
              accessibilityLabel="Rechercher une commune"
              placeholder="Rechercher une commune…"
              placeholderTextColor={t.textMuted}
              value={communeSearch}
              onChangeText={setCommuneSearch}
              className="mb-3 rounded-[14px] border px-4 py-3 text-[15px]"
              style={{
                borderColor: t.border,
                color: t.text,
                backgroundColor: t.surfaceAlt,
              }}
            />
            <Pressable
              className="rounded-[14px] border px-4 py-3"
              style={{
                borderColor: t.border,
                backgroundColor:
                  profile.preferred_commune === null ? t.primaryMuted : t.surface,
              }}
              onPress={() => void pickCommune(null)}
            >
              <Text style={{ color: t.text, fontWeight: '600' }}>
                Aucune préférence (toute la Côte d’Ivoire)
              </Text>
            </Pressable>
            {communesFiltered.length === 0 ? (
              <Text className="mt-4 text-center text-[14px]" style={{ color: t.textSoft }}>
                Aucune commune ne correspond à votre recherche.
              </Text>
            ) : (
              communesFiltered.map((c) => (
                <Pressable
                  key={c}
                  className="mt-2 rounded-[14px] border px-4 py-3"
                  style={{
                    borderColor: t.border,
                    backgroundColor:
                      profile.preferred_commune === c ? t.primaryMuted : t.surface,
                  }}
                  onPress={() => void pickCommune(c)}
                >
                  <Text style={{ color: t.text, fontWeight: '600' }}>{c}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

export default function ProfileScreen(): ReactElement {
  return (
    <ScreenErrorBoundary>
      <ProfileScreenInner />
    </ScreenErrorBoundary>
  );
}
