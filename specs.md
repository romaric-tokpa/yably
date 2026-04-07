# SPECS — Application Pharmacies de Garde (MVP)

> **Ce fichier est la source de vérité du projet.** Toute fonctionnalité, tout écran, tout modèle de données doit s’y référer. Ne jamais implémenter quelque chose qui n’est pas décrit ici sans validation explicite.

-----

## 1. VUE D’ENSEMBLE

### 1.1 Description

Application mobile (iOS + Android) permettant aux habitants d’Abidjan de trouver instantanément la pharmacie de garde la plus proche, avec vérification communautaire en temps réel.

### 1.2 Stack technique

|Composant       |Technologie                                                       |Version min|
|----------------|------------------------------------------------------------------|-----------|
|Mobile          |React Native (Expo SDK 52+)                                       |Expo SDK 52|
|Navigation      |Expo Router (file-based)                                          |v4+        |
|Backend         |Supabase (PostgreSQL + Realtime + Auth + Storage + Edge Functions)|-          |
|Cartographie    |react-native-maps + Google Maps SDK                               |-          |
|State management|Zustand                                                           |v5+        |
|Requêtes API    |TanStack Query (React Query)                                      |v5+        |
|Notifications   |expo-notifications + OneSignal                                    |-          |
|Stockage local  |expo-sqlite (mode hors-ligne)                                     |-          |
|Paiements       |CinetPay SDK (profils premium pharmacie)                          |-          |
|Analytics       |Mixpanel React Native SDK                                         |-          |
|Style           |NativeWind (Tailwind pour React Native)                           |v4+        |
|Icônes          |lucide-react-native                                               |-          |
|Linting         |ESLint + Prettier                                                 |-          |
|Tests           |Jest + React Native Testing Library                               |-          |

### 1.3 Structure du projet

```
/app                    # Expo Router — écrans
  /(tabs)/              # Tab navigator principal
    index.tsx           # Écran accueil (carte + liste)
    notifications.tsx   # Notifications
    profile.tsx         # Profil utilisateur
  /pharmacy/[id].tsx    # Fiche pharmacie (route dynamique)
  /auth/                # Écrans d'authentification
    login.tsx           # Login OTP SMS
    verify.tsx          # Vérification code OTP
  _layout.tsx           # Layout racine
/components             # Composants réutilisables
  /ui                   # Composants UI de base (Button, Card, Badge, etc.)
  /pharmacy             # Composants liés aux pharmacies
    PharmacyCard.tsx
    PharmacyMap.tsx
    VerificationButton.tsx
    WaitTimeChip.tsx
    VerifiedBadge.tsx
    InsuranceFilter.tsx
  /common               # Header, SearchBar, etc.
/hooks                  # Custom hooks
  usePharmacies.ts      # Fetch + cache des pharmacies de garde
  useLocation.ts        # Géolocalisation utilisateur
  useVerification.ts    # Logique vérification communautaire
  useNightMode.ts       # Détection + toggle mode nuit
  useOffline.ts         # Gestion cache hors-ligne
/lib                    # Utilitaires
  supabase.ts           # Client Supabase
  distance.ts           # Calcul distance Haversine
  format.ts             # Formatage (distance, durée, prix)
  constants.ts          # Couleurs, constantes, config
/stores                 # Zustand stores
  authStore.ts          # État authentification
  pharmacyStore.ts      # Pharmacies + filtres
  uiStore.ts            # Mode nuit, vue carte/liste
/types                  # TypeScript types/interfaces
  pharmacy.ts
  user.ts
  verification.ts
/assets                 # Images, fonts
/supabase               # Supabase local
  /migrations           # SQL migrations
  /functions            # Edge Functions
  seed.sql              # Données initiales
```

-----

## 2. MODÈLE DE DONNÉES (Supabase PostgreSQL)

### 2.1 Table `pharmacies`

Données permanentes de toutes les pharmacies. Change rarement.

```sql
CREATE TABLE pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  commune VARCHAR(100) NOT NULL, -- Cocody, Marcory, Plateau, Yopougon, etc.
  city VARCHAR(100) NOT NULL DEFAULT 'Abidjan',
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  phone_primary VARCHAR(20) NOT NULL,
  phone_secondary VARCHAR(20),
  pharmacist_name VARCHAR(255),
  photo_url TEXT, -- URL Supabase Storage
  accepted_insurance JSONB DEFAULT '[]', -- ["MUGEFCI", "NSIA", "CNAM"]
  accepted_mobile_money JSONB DEFAULT '[]', -- ["Orange Money", "MTN Money", "Wave"]
  rating DECIMAL(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index géospatial pour requêtes par proximité
CREATE INDEX idx_pharmacies_location ON pharmacies (latitude, longitude);
CREATE INDEX idx_pharmacies_commune ON pharmacies (commune);
CREATE INDEX idx_pharmacies_active ON pharmacies (is_active) WHERE is_active = true;
```

### 2.2 Table `gardes`

Rotations hebdomadaires. Mise à jour chaque semaine.

```sql
CREATE TABLE gardes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  start_date DATE NOT NULL, -- Samedi début de garde
  end_date DATE NOT NULL,   -- Vendredi fin de garde
  is_24h BOOLEAN DEFAULT false, -- true = 24h/24, false = nocturne (20h-8h)
  source VARCHAR(50) NOT NULL, -- 'unppci', 'scraping', 'admin', 'ocr'
  verified_by_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(pharmacy_id, start_date)
);

CREATE INDEX idx_gardes_dates ON gardes (start_date, end_date);
CREATE INDEX idx_gardes_pharmacy ON gardes (pharmacy_id);
```

### 2.3 Table `verifications`

Confirmations communautaires en temps réel.

```sql
CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(10) NOT NULL CHECK (status IN ('open', 'closed')),
  user_latitude DECIMAL(10,8),
  user_longitude DECIMAL(11,8),
  distance_to_pharmacy INTEGER, -- en mètres, calculé côté serveur
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_verifications_pharmacy_recent ON verifications (pharmacy_id, created_at DESC);
CREATE INDEX idx_verifications_user ON verifications (user_id);
```

### 2.4 Table `profiles` (extension de auth.users)

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone VARCHAR(20),
  display_name VARCHAR(100),
  points INTEGER DEFAULT 0,
  badge_level INTEGER DEFAULT 1, -- 1=Nouveau, 2=Contributeur, 3=Expert, 4=Champion, 5=Légende
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'pharmacist', 'admin')),
  preferred_commune VARCHAR(100),
  avatar_url TEXT,
  notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.5 Table `pharmacy_stats` (statistiques pharmacien)

```sql
CREATE TABLE pharmacy_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  calls_clicked INTEGER DEFAULT 0,
  directions_clicked INTEGER DEFAULT 0,
  verifications_received INTEGER DEFAULT 0,
  
  UNIQUE(pharmacy_id, date)
);
```

### 2.6 Table `pharmacy_subscriptions` (profils premium)

```sql
CREATE TABLE pharmacy_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  plan VARCHAR(20) NOT NULL CHECK (plan IN ('free', 'premium', 'boost')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  payment_reference VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.7 Row Level Security (RLS)

```sql
-- Pharmacies : lecture publique, écriture admin
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharmacies_read" ON pharmacies FOR SELECT USING (true);
CREATE POLICY "pharmacies_write" ON pharmacies FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Gardes : lecture publique, écriture admin
ALTER TABLE gardes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gardes_read" ON gardes FOR SELECT USING (true);
CREATE POLICY "gardes_write" ON gardes FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Vérifications : lecture publique, écriture authentifié
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verifications_read" ON verifications FOR SELECT USING (true);
CREATE POLICY "verifications_insert" ON verifications FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- Profils : lecture/écriture propriétaire
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
```

### 2.8 Fonctions SQL utilitaires

```sql
-- Récupérer les pharmacies de garde AUJOURD'HUI avec distance
CREATE OR REPLACE FUNCTION get_pharmacies_de_garde(
  user_lat DECIMAL,
  user_lng DECIMAL,
  max_distance_km INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  address TEXT,
  commune VARCHAR,
  latitude DECIMAL,
  longitude DECIMAL,
  phone_primary VARCHAR,
  phone_secondary VARCHAR,
  pharmacist_name VARCHAR,
  photo_url TEXT,
  accepted_insurance JSONB,
  accepted_mobile_money JSONB,
  rating DECIMAL,
  review_count INTEGER,
  is_24h BOOLEAN,
  distance_km DECIMAL,
  duration_min INTEGER,
  verification_count BIGINT,
  last_verification TIMESTAMPTZ,
  last_verification_status VARCHAR,
  avg_wait_time INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.name, p.address, p.commune,
    p.latitude, p.longitude,
    p.phone_primary, p.phone_secondary,
    p.pharmacist_name, p.photo_url,
    p.accepted_insurance, p.accepted_mobile_money,
    p.rating, p.review_count,
    g.is_24h,
    -- Distance Haversine en km
    ROUND(
      (6371 * acos(
        cos(radians(user_lat)) * cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(user_lng)) +
        sin(radians(user_lat)) * sin(radians(p.latitude))
      ))::DECIMAL, 1
    ) AS distance_km,
    -- Estimation durée (vitesse moyenne 20km/h en ville)
    ROUND(
      (6371 * acos(
        cos(radians(user_lat)) * cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(user_lng)) +
        sin(radians(user_lat)) * sin(radians(p.latitude))
      )) / 20 * 60
    )::INTEGER AS duration_min,
    -- Vérifications des dernières 2h
    (SELECT COUNT(*) FROM verifications v
     WHERE v.pharmacy_id = p.id
     AND v.created_at > now() - interval '2 hours') AS verification_count,
    -- Dernière vérification
    (SELECT v.created_at FROM verifications v
     WHERE v.pharmacy_id = p.id
     ORDER BY v.created_at DESC LIMIT 1) AS last_verification,
    (SELECT v.status FROM verifications v
     WHERE v.pharmacy_id = p.id
     ORDER BY v.created_at DESC LIMIT 1) AS last_verification_status,
    -- Temps d'attente estimé (basé sur vérifications récentes, placeholder)
    NULL::INTEGER AS avg_wait_time
  FROM pharmacies p
  INNER JOIN gardes g ON g.pharmacy_id = p.id
  WHERE p.is_active = true
    AND CURRENT_DATE BETWEEN g.start_date AND g.end_date
  HAVING ROUND(
    (6371 * acos(
      cos(radians(user_lat)) * cos(radians(p.latitude)) *
      cos(radians(p.longitude) - radians(user_lng)) +
      sin(radians(user_lat)) * sin(radians(p.latitude))
    ))::DECIMAL, 1
  ) <= max_distance_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- Ajouter une vérification (avec anti-fraude)
CREATE OR REPLACE FUNCTION add_verification(
  p_pharmacy_id UUID,
  p_user_id UUID,
  p_status VARCHAR,
  p_user_lat DECIMAL,
  p_user_lng DECIMAL
)
RETURNS JSONB AS $$
DECLARE
  v_pharmacy RECORD;
  v_distance INTEGER;
  v_recent_count INTEGER;
  v_points INTEGER;
BEGIN
  -- Récupérer la pharmacie
  SELECT latitude, longitude INTO v_pharmacy FROM pharmacies WHERE id = p_pharmacy_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pharmacie introuvable');
  END IF;
  
  -- Calculer distance utilisateur <-> pharmacie en mètres
  v_distance := ROUND(
    6371000 * acos(
      cos(radians(p_user_lat)) * cos(radians(v_pharmacy.latitude)) *
      cos(radians(v_pharmacy.longitude) - radians(p_user_lng)) +
      sin(radians(p_user_lat)) * sin(radians(v_pharmacy.latitude))
    )
  );
  
  -- Anti-fraude : distance max 500m
  IF v_distance > 500 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vous devez être à proximité de la pharmacie');
  END IF;
  
  -- Anti-fraude : max 1 vérification par pharmacie par 2h par user
  SELECT COUNT(*) INTO v_recent_count FROM verifications
  WHERE pharmacy_id = p_pharmacy_id
    AND user_id = p_user_id
    AND created_at > now() - interval '2 hours';
  
  IF v_recent_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vous avez déjà vérifié cette pharmacie récemment');
  END IF;
  
  -- Insérer la vérification
  INSERT INTO verifications (pharmacy_id, user_id, status, user_latitude, user_longitude, distance_to_pharmacy)
  VALUES (p_pharmacy_id, p_user_id, p_status, p_user_lat, p_user_lng, v_distance);
  
  -- Attribuer des points
  v_points := CASE WHEN p_status = 'open' THEN 5 ELSE 3 END;
  UPDATE profiles SET points = points + v_points WHERE id = p_user_id;
  
  RETURN jsonb_build_object('success', true, 'points_earned', v_points, 'distance', v_distance);
END;
$$ LANGUAGE plpgsql;
```

-----

## 3. AUTHENTIFICATION

### 3.1 Flux d’authentification (OTP SMS)

```
1. Utilisateur saisit son numéro de téléphone (+225 XX XX XX XX XX)
2. Supabase Auth envoie un code OTP par SMS
3. Utilisateur saisit le code à 6 chiffres
4. Si valide → session créée, profil auto-créé via trigger
5. Token JWT stocké localement (expo-secure-store)
```

### 3.2 Trigger de création de profil

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, phone)
  VALUES (NEW.id, NEW.phone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 3.3 Navigation conditionnelle

- **Non authentifié** → Peut voir la carte et la liste (lecture seule)
- **Authentifié** → Peut vérifier, noter, accéder au profil
- **Pharmacien** → Accès au dashboard pharmacien (web)
- **Admin** → Accès au panel admin (web)

> **IMPORTANT** : L’authentification n’est PAS requise pour consulter les pharmacies de garde. Elle est requise uniquement pour la vérification communautaire et le profil.

-----

## 4. ÉCRANS ET COMPOSANTS

### 4.1 Écran Accueil — `/(tabs)/index.tsx`

**Layout :**

```
┌─────────────────────────────┐
│  [●] 5 OUVERTES    [🌙] [🔔]│  ← Header
│  Pharmacies de garde         │
├─────────────────────────────┤
│  [🔍 Rechercher...    ] [⚙]│  ← Search + Filter
│  [  🗺 Carte  |  📋 Liste  ] │  ← Toggle vue
├─────────────────────────────┤
│  ⚡ Prochain changement...   │  ← Alerte (dismissable)
├─────────────────────────────┤
│                              │
│  [Carte interactive]         │  ← Si mode carte
│  ou                          │
│  [Liste de PharmacyCards]    │  ← Si mode liste
│                              │
├─────────────────────────────┤
│  [🏠] [🔔] [👤]              │  ← Tab bar
└─────────────────────────────┘
```

**Comportement :**

- Au chargement : demander la géolocalisation, appeler `get_pharmacies_de_garde(lat, lng)`
- Afficher résultats triés par distance
- Le toggle Carte/Liste conserve les mêmes données
- La recherche filtre côté client (pas de nouvelle requête)
- Les filtres (commune, assurance) filtrent côté client
- Abonnement Supabase Realtime sur la table `verifications` → mise à jour live des badges de vérification
- Entre 20h et 6h : activer le mode nuit automatiquement (si non overridé)
- Pull-to-refresh pour recharger les données

**Données nécessaires :**

```typescript
interface PharmacyDeGarde {
  id: string;
  name: string;
  address: string;
  commune: string;
  latitude: number;
  longitude: number;
  phone_primary: string;
  phone_secondary: string | null;
  pharmacist_name: string | null;
  photo_url: string | null;
  accepted_insurance: string[];
  accepted_mobile_money: string[];
  rating: number;
  review_count: number;
  is_24h: boolean;
  distance_km: number;
  duration_min: number;
  verification_count: number;
  last_verification: string | null;
  last_verification_status: 'open' | 'closed' | null;
  avg_wait_time: number | null;
}
```

### 4.2 Composant `PharmacyCard.tsx`

**Props :**

```typescript
interface PharmacyCardProps {
  pharmacy: PharmacyDeGarde;
  onPress: (pharmacy: PharmacyDeGarde) => void;
}
```

**Affichage :**

```
┌──────────────────────────────────┐
│  Pharmacie du Plateau      1.2 km│
│  Av. Franchet d'Esperey    8 min │
│                                   │
│  [✅ Vérifié • 12 pers • il y a 8min] [⏱ ~5 min] │
│                                   │
│  ─────────────────────────────── │
│  ★ 4.8 (234)    [MUGEFCI] [NSIA] [+2] │
└──────────────────────────────────┘
```

**Règles d’affichage :**

- Badge vérifié VERT si `verification_count > 0` ET `last_verification_status === 'open'` ET dernière vérification < 2h
- Badge NON VÉRIFIÉ ORANGE si `verification_count === 0` ou vérification > 2h
- Badge SIGNALÉ ROUGE si `last_verification_status === 'closed'`
- Temps d’attente : VERT si ≤ 10min, ORANGE si ≤ 20min, ROUGE si > 20min
- Assurances : afficher les 2 premières + badge “+X” si plus

### 4.3 Composant `PharmacyMap.tsx`

**Props :**

```typescript
interface PharmacyMapProps {
  pharmacies: PharmacyDeGarde[];
  userLocation: { latitude: number; longitude: number } | null;
  onMarkerPress: (pharmacy: PharmacyDeGarde) => void;
}
```

**Comportement :**

- Centrer sur la position utilisateur avec zoom couvrant les pharmacies les plus proches
- Markers personnalisés :
  - Vert pulsant = vérifié ouvert
  - Orange = non vérifié
  - Rouge = signalé fermé
  - Bleu = position utilisateur
- Au tap sur un marker → afficher un callout avec nom + distance + bouton “Voir”

### 4.4 Écran Fiche Pharmacie — `/pharmacy/[id].tsx`

**Layout :**

```
┌─────────────────────────────────┐
│  [←]  Détails           [↗]    │  ← Header
├─────────────────────────────────┤
│  Pharmacie du Plateau           │
│  Av. Franchet d'Esperey        │
│  👨‍⚕️ Dr. Kouamé Affoué         │
│                                  │
│  [● Ouvert] [✅ Vérifié] [⏱ 5m]│  ← Status badges
│                                  │
│  ┌────────┬────────┬────────┐   │
│  │ 1.2 km │  8 min │ 4.8/5  │   │  ← Stats grid
│  │Distance│ Trajet │  Note   │   │
│  └────────┴────────┴────────┘   │
│                                  │
│  🕐 Horaires de garde            │
│  Ce soir 20h → Demain 8h        │
│                                  │
│  Accepte: [MUGEFCI] [NSIA] ...  │
│                                  │
├─────────────────────────────────┤
│  👥 Vérification communautaire   │
│  12 personnes ont confirmé       │
│  [✅ Confirmer que c'est ouvert] │  ← CTA vérification
├─────────────────────────────────┤
│                                  │
│  [📞]  [🧭 Itinéraire — 8 min]  │  ← Bottom CTA fixe
└─────────────────────────────────┘
```

**Actions :**

- **Bouton Appeler** → `Linking.openURL('tel:+2250708091010')`
- **Bouton Itinéraire** → Ouvrir Google Maps / Apple Maps / Waze avec les coordonnées
- **Bouton Vérifier** → Si authentifié + géolocalisé + à proximité (< 500m) → appeler `add_verification()`
- **Bouton Partager** → Share API native avec lien deep link
- **Tracking analytics** → Enregistrer vue, clic appel, clic itinéraire dans `pharmacy_stats`

### 4.5 Écran Notifications — `/(tabs)/notifications.tsx`

- Liste des notifications push reçues
- Types : changement de garde, points gagnés, rappels
- Chaque notification a un titre, body, timestamp, icône

### 4.6 Écran Profil — `/(tabs)/profile.tsx`

```
┌──────────────────────────────────┐
│  Aminata Diallo                   │
│  +225 07 08 09 10                │
│  ⭐ 125 points • Badge Contributeur │
│                                   │
│  [Mes vérifications]      →      │
│  [Commune préférée]       →      │
│  [Mode nuit]          [toggle]   │
│  [Notifications]      [toggle]   │
│  [À propos]               →      │
│  [Se déconnecter]                │
└──────────────────────────────────┘
```

### 4.7 Écrans Auth — `/auth/login.tsx` + `/auth/verify.tsx`

- Écran 1 : Champ téléphone avec indicatif +225, bouton “Recevoir le code”
- Écran 2 : 6 champs pour le code OTP, countdown 60s, bouton “Renvoyer”
- Après vérification → rediriger vers l’écran précédent

-----

## 5. THÈME ET DESIGN SYSTEM

### 5.1 Tokens de couleur

```typescript
export const theme = {
  day: {
    bg: '#F4F1EC',
    surface: '#FFFFFF',
    surfaceAlt: '#F9F7F4',
    primary: '#0D7C5F',
    primaryGlow: '#10A37F',
    primaryMuted: 'rgba(13,124,95,0.08)',
    accent: '#E5913A',
    accentGlow: '#F0A04B',
    accentMuted: 'rgba(229,145,58,0.10)',
    text: '#1B1F23',
    textSoft: '#6B7485',
    textMuted: '#9DA5B4',
    border: '#E8E4DD',
    danger: '#D94452',
    success: '#22A06B',
    verified: '#0D7C5F',
    unverified: '#E5913A',
  },
  night: {
    bg: '#0D1117',
    surface: '#161B22',
    surfaceAlt: '#1C2128',
    primary: '#10A37F',
    primaryGlow: '#2EEAAD',
    primaryMuted: 'rgba(16,163,127,0.12)',
    accent: '#F0A04B',
    accentGlow: '#FFD07B',
    accentMuted: 'rgba(240,160,75,0.12)',
    text: '#E6EDF3',
    textSoft: '#8B949E',
    textMuted: '#484F58',
    border: '#30363D',
    danger: '#F85149',
    success: '#2EE0A1',
    verified: '#2EE0A1',
    unverified: '#F0A04B',
  },
};
```

### 5.2 Typographie

- **Font** : System font (San Francisco sur iOS, Roboto sur Android) pour la performance
- **Titres** : Bold 700-800, taille 20-24
- **Corps** : Regular 400, taille 14-15
- **Labels** : Medium 500-600, taille 11-13
- **Chiffres** : Bold 700-800, monospace pour distance/temps

### 5.3 Espacement et arrondis

- **Border radius** : 20px (cards), 14px (boutons, inputs), 12px (badges), 50% (avatars)
- **Padding cards** : 16px
- **Gap entre cards** : 10px
- **Padding écran** : 20px horizontal

-----

## 6. MODE HORS-LIGNE

### 6.1 Stratégie de cache

```
Au lancement de l'app :
1. Charger les données depuis SQLite local (affichage instantané)
2. Lancer la requête Supabase en arrière-plan
3. Si succès → mettre à jour SQLite + UI
4. Si échec (pas de réseau) → rester sur les données locales
```

### 6.2 Données cachées localement

- Liste complète des pharmacies (table `pharmacies`)
- Gardes de la semaine en cours (table `gardes`)
- Dernières vérifications (24h)
- Préférences utilisateur

### 6.3 Indicateur hors-ligne

- Afficher une bannière discrète en haut de l’écran : “Mode hors-ligne — données du [date]”
- Désactiver le bouton de vérification communautaire (nécessite le réseau)

-----

## 7. NOTIFICATIONS PUSH

### 7.1 Types de notifications

|Type                 |Déclencheur            |Contenu                                                           |
|---------------------|-----------------------|------------------------------------------------------------------|
|`garde_change`       |Vendredi 18h (cron)    |“🔄 Nouvelles pharmacies de garde dès demain ! Consultez la liste.”|
|`verification_thanks`|Après une vérification |“🎉 +5 points ! Merci d’avoir confirmé l’ouverture de Pharmacie X.”|
|`badge_unlocked`     |Seuil de points atteint|“🏅 Félicitations ! Vous êtes maintenant Contributeur.”            |
|`reminder`           |Dimanche 20h (cron)    |“🌙 Besoin d’une pharmacie ce soir ? Consultez les gardes.”        |

### 7.2 Segmentation

- Envoyer les alertes de garde par commune préférée
- Ne pas notifier les utilisateurs qui ont désactivé les notifications

-----

## 8. GAMIFICATION

### 8.1 Système de points

|Action                         |Points           |
|-------------------------------|-----------------|
|Vérification “ouvert”          |+5               |
|Signalement “fermé”            |+3               |
|Première vérification du jour  |+2 (bonus)       |
|5 vérifications dans la semaine|+10 (bonus hebdo)|

### 8.2 Badges

|Niveau|Nom         |Condition     |
|------|------------|--------------|
|1     |Nouveau     |0-49 points   |
|2     |Contributeur|50-199 points |
|3     |Expert      |200-499 points|
|4     |Champion    |500-999 points|
|5     |Légende     |1000+ points  |

-----

## 9. ANALYTICS (EVENTS À TRACKER)

```typescript
// Événements Mixpanel
track('app_opened', { night_mode: boolean, offline: boolean })
track('pharmacy_list_viewed', { count: number, commune_filter: string | null })
track('pharmacy_card_tapped', { pharmacy_id: string, distance_km: number })
track('pharmacy_detail_viewed', { pharmacy_id: string })
track('call_button_tapped', { pharmacy_id: string })
track('directions_button_tapped', { pharmacy_id: string, app: 'google_maps' | 'apple_maps' | 'waze' })
track('verification_submitted', { pharmacy_id: string, status: 'open' | 'closed', distance: number })
track('search_performed', { query: string, results_count: number })
track('filter_applied', { filter_type: 'commune' | 'insurance', value: string })
track('night_mode_toggled', { enabled: boolean, auto: boolean })
track('notification_received', { type: string })
track('notification_tapped', { type: string })
track('share_tapped', { pharmacy_id: string })
track('auth_started', {})
track('auth_completed', { method: 'otp_sms' })
```

-----

## 10. EDGE FUNCTIONS SUPABASE

### 10.1 `import-gardes`

- Déclencheur : cron hebdomadaire (samedi matin) ou upload admin
- Entrée : fichier CSV ou résultat OCR
- Action : insérer les nouvelles gardes, désactiver les anciennes

### 10.2 `send-garde-notification`

- Déclencheur : cron vendredi 18h
- Action : envoyer notification push via OneSignal à tous les utilisateurs actifs, segmenté par commune

### 10.3 `compute-pharmacy-stats`

- Déclencheur : cron quotidien minuit
- Action : agréger les événements analytics dans `pharmacy_stats`

-----

## 11. RÈGLES MÉTIER IMPORTANTES

1. **Les gardes changent chaque samedi matin.** La requête `get_pharmacies_de_garde` utilise `CURRENT_DATE` pour déterminer la garde active.
1. **La vérification expire après 2h.** Un badge “vérifié” n’est affiché que si la dernière vérification a moins de 2h.
1. **Anti-fraude géographique : rayon 500m.** L’utilisateur doit être physiquement à moins de 500 mètres de la pharmacie pour vérifier. Le calcul est fait côté serveur (Edge Function), pas côté client.
1. **Rate limiting vérification : 1 par pharmacie par 2h par utilisateur.**
1. **Mode nuit automatique entre 20h et 6h** sauf override manuel. L’override persiste jusqu’au prochain cycle (6h ou 20h).
1. **L’app fonctionne sans authentification** pour la consultation. L’auth est requise uniquement pour : vérifier, noter, accéder au profil.
1. **Les pharmacies sont triées par distance** par défaut. Pas de tri par popularité ou par note.
1. **Le numéro de téléphone ivoirien** suit le format +225 XX XX XX XX XX (10 chiffres après l’indicatif).

-----

## 12. TABLES FUTURES (NE PAS IMPLÉMENTER DANS LE MVP)

Ces tables sont prévues pour les phases ultérieures. L’architecture doit les anticiper (relations, nommage cohérent) sans les créer maintenant :

- `products` — Catalogue médicaments
- `pharmacy_stock` — Stock par pharmacie
- `orders` — Commandes
- `deliveries` — Livraisons
- `doctors` — Médecins
- `appointments` — Rendez-vous
- `medical_documents` — Documents médicaux
- `insurance_profiles` — Profils assurance
- `clinics` — Cliniques
- `prescriptions` — Ordonnances

-----

## 13. COMMANDES UTILES

```bash
# Démarrer le projet
npx expo start

# Lancer sur iOS
npx expo run:ios

# Lancer sur Android
npx expo run:android

# Supabase local
npx supabase start
npx supabase db reset

# Appliquer les migrations
npx supabase db push

# Générer les types TypeScript depuis Supabase
npx supabase gen types typescript --local > types/supabase.ts

# Build production
eas build --platform all

# Soumettre aux stores
eas submit --platform all
```