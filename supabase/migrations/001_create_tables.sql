-- Modèle specs.md §2.1–§2.6 : tables, index, contraintes

-- ---------------------------------------------------------------------------
-- 2.1 pharmacies
-- ---------------------------------------------------------------------------
CREATE TABLE pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  commune VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL DEFAULT 'Abidjan',
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  phone_primary VARCHAR(20) NOT NULL,
  phone_secondary VARCHAR(20),
  pharmacist_name VARCHAR(255),
  photo_url TEXT,
  accepted_insurance JSONB DEFAULT '[]',
  accepted_mobile_money JSONB DEFAULT '[]',
  rating DECIMAL(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pharmacies_location ON pharmacies (latitude, longitude);
CREATE INDEX idx_pharmacies_commune ON pharmacies (commune);
CREATE INDEX idx_pharmacies_active ON pharmacies (is_active) WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- 2.2 gardes
-- ---------------------------------------------------------------------------
CREATE TABLE gardes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_24h BOOLEAN DEFAULT false,
  source VARCHAR(50) NOT NULL,
  verified_by_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (pharmacy_id, start_date)
);

CREATE INDEX idx_gardes_dates ON gardes (start_date, end_date);
CREATE INDEX idx_gardes_pharmacy ON gardes (pharmacy_id);

-- ---------------------------------------------------------------------------
-- 2.3 verifications
-- ---------------------------------------------------------------------------
CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(10) NOT NULL CHECK (status IN ('open', 'closed')),
  user_latitude DECIMAL(10,8),
  user_longitude DECIMAL(11,8),
  distance_to_pharmacy INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_verifications_pharmacy_recent ON verifications (pharmacy_id, created_at DESC);
CREATE INDEX idx_verifications_user ON verifications (user_id);

-- ---------------------------------------------------------------------------
-- 2.4 profiles
-- ---------------------------------------------------------------------------
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone VARCHAR(20),
  display_name VARCHAR(100),
  points INTEGER DEFAULT 0,
  badge_level INTEGER DEFAULT 1,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'pharmacist', 'admin')),
  preferred_commune VARCHAR(100),
  avatar_url TEXT,
  notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.5 pharmacy_stats
-- ---------------------------------------------------------------------------
CREATE TABLE pharmacy_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  calls_clicked INTEGER DEFAULT 0,
  directions_clicked INTEGER DEFAULT 0,
  verifications_received INTEGER DEFAULT 0,

  UNIQUE (pharmacy_id, date)
);

-- ---------------------------------------------------------------------------
-- 2.6 pharmacy_subscriptions
-- ---------------------------------------------------------------------------
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
