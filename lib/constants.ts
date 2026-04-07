/**
 * Design system : couleurs (specs §5.1), espacements, rayons, breakpoints et typo (§5.2–5.3).
 */

/** Dégradé orange Filtre (mode nuit — design Yably). */
export const yablyOrangeGradient = ['#E5913A', '#D47828'] as const;

export const theme = {
  day: {
    bg: '#FBF8F4',
    surface: '#FFFFFF',
    surfaceAlt: '#F6F3EE',
    primary: '#0D7C5F',
    primaryGlow: '#10A37F',
    primaryMuted: 'rgba(13,124,95,0.07)',
    accent: '#E5913A',
    accentGlow: '#D47828',
    accentMuted: 'rgba(229,145,58,0.08)',
    text: '#1B1F23',
    textSoft: '#6B7485',
    textMuted: '#9DA5B4',
    border: '#EDE9E2',
    danger: '#D94452',
    success: '#0D7C5F',
    verified: '#0D7C5F',
    unverified: '#E5913A',
  },
  night: {
    bg: '#0D1117',
    surface: '#161B22',
    surfaceAlt: '#1C2128',
    primary: '#2EEAAD',
    primaryGlow: '#10A37F',
    primaryMuted: 'rgba(46,234,173,0.08)',
    accent: '#F0A04B',
    accentGlow: '#FFB95F',
    accentMuted: 'rgba(240,160,75,0.1)',
    text: '#E6EDF3',
    textSoft: '#8B949E',
    textMuted: '#484F58',
    border: '#30363D',
    danger: '#F85149',
    success: '#2EEAAD',
    verified: '#2EEAAD',
    unverified: '#F0A04B',
  },
} as const;

export type ThemeColors = (typeof theme)['day' | 'night'];

/** Espacements (specs §5.3 + échelle utilitaire) */
export const spacing = {
  screenHorizontal: 18,
  cardPadding: 16,
  cardGap: 10,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/** Rayons de bordure (specs §5.3) */
export const borderRadius = {
  card: 20,
  button: 14,
  input: 14,
  badge: 12,
  /** Pour avatars circulaires (StyleSheet / borderRadius) */
  avatarPercent: '50%' as const,
} as const;

/** Largeurs mini typiques (logique dimension hook / layout) */
export const breakpoints = {
  sm: 360,
  md: 768,
  lg: 1024,
} as const;

/** Communes de Côte d’Ivoire (profil, filtres, admin) — voir `cote-ivoire-communes.ts`. */
export { COTE_IVOIRE_COMMUNES } from './cote-ivoire-communes';

/** Typographie système (specs §5.2) — à combiner avec la font plateforme */
export const typography = {
  title: { fontWeight: '700' as const, fontSize: 22 },
  titleLarge: { fontWeight: '800' as const, fontSize: 24 },
  body: { fontWeight: '400' as const, fontSize: 14 },
  bodyLarge: { fontWeight: '400' as const, fontSize: 15 },
  label: { fontWeight: '500' as const, fontSize: 12 },
  labelSmall: { fontWeight: '600' as const, fontSize: 11 },
  numeric: { fontWeight: '700' as const, fontVariant: ['tabular-nums' as const] },
} as const;
