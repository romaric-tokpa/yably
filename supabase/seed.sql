-- Données de test (pharmacies à Abidjan, gardes semaine en cours, vérifications récentes).
-- Nécessite les migrations appliquées. Mot de passe factice uniquement pour le compte seed (développement).

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 10 pharmacies (Cocody, Plateau, Marcory) — coordonnées réelles approximatives
-- ---------------------------------------------------------------------------
INSERT INTO pharmacies (
  name,
  address,
  commune,
  city,
  latitude,
  longitude,
  phone_primary,
  phone_secondary,
  pharmacist_name,
  accepted_insurance,
  accepted_mobile_money,
  rating,
  review_count
)
VALUES
  (
    'Pharmacie du Plateau',
    'Boulevard de la République, face à la Poste Centrale',
    'Plateau',
    'Abidjan',
    5.31989700,
    -4.01676200,
    '+22520213100',
    '+22520213101',
    'Dr. Affoué N''Guessan',
    '["MUGEFCI", "NSIA", "CNAM"]'::jsonb,
    '["Orange Money", "Wave", "MTN Money"]'::jsonb,
    4.7,
    128
  ),
  (
    'Pharmacie Les Halles',
    'Avenue Chardy, près de la Cathédrale Saint-Paul',
    'Plateau',
    'Abidjan',
    5.32124000,
    -4.01452000,
    '+22520213220',
    NULL,
    'Pharm. Koné Aminata',
    '["MUGEFCI", "CNAM"]'::jsonb,
    '["Orange Money", "Wave"]'::jsonb,
    4.5,
    86
  ),
  (
    'Pharmacie Ste Marthe',
    'Cocody, près du Lycée Technique',
    'Cocody',
    'Abidjan',
    5.35809000,
    -3.98965000,
    '+22522486500',
    '+22522486501',
    'Dr. Yao Kouassi',
    '["NSIA", "MUGEFCI"]'::jsonb,
    '["MTN Money", "Orange Money"]'::jsonb,
    4.8,
    215
  ),
  (
    'Pharmacie Angré 8ème Tranche',
    'Cité Aliénor, non loin du carrefour Solibra',
    'Cocody',
    'Abidjan',
    5.39185000,
    -3.95912000,
    '+22522491234',
    NULL,
    'Pharm. Diabaté Mariam',
    '["MUGEFCI"]'::jsonb,
    '["Wave", "Orange Money"]'::jsonb,
    4.4,
    92
  ),
  (
    'Pharmacie II Plateaux Vallon',
    'Vallon, à côté du supermarché',
    'Cocody',
    'Abidjan',
    5.34789000,
    -4.00823000,
    '+22522477888',
    NULL,
    'Dr. Coulibaly Idrissa',
    '["NSIA", "CNAM", "MUGEFCI"]'::jsonb,
    '["Orange Money", "MTN Money", "Wave"]'::jsonb,
    4.6,
    164
  ),
  (
    'Pharmacie Riviera 3',
    'Riviera Palmeraie, zone résidentielle',
    'Cocody',
    'Abidjan',
    5.36234000,
    -3.97234000,
    '+22522455678',
    '+22522455679',
    'Pharm. Ouattara Fatou',
    '["MUGEFCI"]'::jsonb,
    '["Wave"]'::jsonb,
    4.3,
    71
  ),
  (
    'Pharmacie Marcory Zone 4',
    'Boulevard VGE, Zone 4',
    'Marcory',
    'Abidjan',
    5.27823000,
    -3.97746000,
    '+22521334455',
    NULL,
    'Dr. Bamba Souleymane',
    '["CNAM", "NSIA"]'::jsonb,
    '["Orange Money", "MTN Money"]'::jsonb,
    4.5,
    103
  ),
  (
    'Pharmacie Marcory Résidentiel',
    'Quartier résidentiel, non loin de la mairie de Marcory',
    'Marcory',
    'Abidjan',
    5.26890000,
    -3.98346000,
    '+22521331122',
    NULL,
    'Pharm. Tano Brigitte',
    '["MUGEFCI", "NSIA"]'::jsonb,
    '["Wave", "Orange Money"]'::jsonb,
    4.2,
    58
  ),
  (
    'Pharmacie Marcory Bonoumin',
    'Bonoumin, près du rond-point',
    'Marcory',
    'Abidjan',
    5.28346000,
    -3.98901000,
    '+22521339900',
    '+22521339901',
    'Dr. Eba Henri',
    '["MUGEFCI"]'::jsonb,
    '["MTN Money", "Wave"]'::jsonb,
    4.4,
    77
  ),
  (
    'Pharmacie Danga',
    'Cocody Danga, zone commerciale',
    'Cocody',
    'Abidjan',
    5.34568000,
    -3.99568000,
    '+22522443300',
    NULL,
    'Pharm. Séka Grace',
    '["NSIA"]'::jsonb,
    '["Orange Money"]'::jsonb,
    4.1,
    44
  );

-- ---------------------------------------------------------------------------
-- 5 gardes : semaine samedi → vendredi contenant CURRENT_DATE (specs §2.2)
-- ---------------------------------------------------------------------------
INSERT INTO gardes (pharmacy_id, start_date, end_date, is_24h, source, verified_by_admin)
SELECT
  id,
  (CURRENT_DATE - ((EXTRACT(DOW FROM CURRENT_DATE)::integer + 1) % 7))::date AS start_date,
  (CURRENT_DATE - ((EXTRACT(DOW FROM CURRENT_DATE)::integer + 1) % 7) + 6)::date AS end_date,
  false,
  'admin',
  true
FROM pharmacies
ORDER BY name ASC
LIMIT 5;

-- ---------------------------------------------------------------------------
-- Compte test (trigger §3.2 → profil auto)
-- En local récent, auth.instances peut être vide : un SELECT … LIMIT 1 n’insère
-- alors aucune ligne → les vérifications cassent la FK vers auth.users.
-- On utilise l’instance réelle si elle existe, sinon l’UUID nul usuel en dev local.
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  phone,
  phone_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_current,
  email_change_token_new,
  email_change,
  email_change_confirm_status,
  phone_change_token,
  phone_change,
  reauthentication_token,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
)
VALUES (
  COALESCE(
    (SELECT id FROM auth.instances LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ),
  'b0000000-0000-4000-8000-000000000001'::uuid,
  'authenticated',
  'authenticated',
  'seed.contrib@pharmacie-garde.local',
  extensions.crypt('seed-dev-not-for-prod', extensions.gen_salt('bf')),
  now(),
  '+2250712345678',
  now(),
  '',
  '',
  '',
  '',
  '',
  0,
  '',
  '',
  '',
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  '{}'::jsonb,
  now(),
  now(),
  false,
  false
);

-- ---------------------------------------------------------------------------
-- Compte administrateur (connexion email / mot de passe — panel admin Vite)
-- Hash bcrypt $2b$ (cost 10) généré hors pgcrypto : GoTrue parse le hash avec
-- bcrypt.Cost en Go ; certains hashes produits par crypt() peuvent provoquer un 500.
-- Mot de passe en local : 18-19Th022611
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  phone,
  phone_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_current,
  email_change_token_new,
  email_change,
  email_change_confirm_status,
  phone_change_token,
  phone_change,
  reauthentication_token,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
)
VALUES (
  COALESCE(
    (SELECT id FROM auth.instances LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ),
  'a0000000-0000-4000-8000-000000000002'::uuid,
  'authenticated',
  'authenticated',
  'admin@yably.com',
  '$2b$10$Y68Pg43c.lY0lG/LX7zNRuovuCrfY7PIa95E2fiWAiL//JM1ou8Jq',
  now(),
  NULL,
  NULL,
  '',
  '',
  '',
  '',
  '',
  0,
  '',
  '',
  '',
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  '{}'::jsonb,
  now(),
  now(),
  false,
  false
);

-- Nécessaire pour signInWithPassword (provider email) — même schéma que les exemples officiels seed
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES (
  'a0000000-0000-4000-8000-000000000002'::uuid,
  'a0000000-0000-4000-8000-000000000002'::uuid,
  jsonb_build_object(
    'sub', 'a0000000-0000-4000-8000-000000000002',
    'email', 'admin@yably.com',
    'email_verified', true
  ),
  'email',
  'a0000000-0000-4000-8000-000000000002'::uuid,
  now(),
  now(),
  now()
);

UPDATE public.profiles
SET role = 'admin', display_name = 'Administrateur'
WHERE id = 'a0000000-0000-4000-8000-000000000002'::uuid;

-- ---------------------------------------------------------------------------
-- 3 vérifications récentes (même contributeur, 3 pharmacies distinctes en garde)
-- ---------------------------------------------------------------------------
INSERT INTO verifications (
  pharmacy_id,
  user_id,
  status,
  user_latitude,
  user_longitude,
  distance_to_pharmacy,
  created_at
)
SELECT
  p.id,
  'b0000000-0000-4000-8000-000000000001'::uuid,
  'open',
  p.latitude + 0.00008000,
  p.longitude + 0.00004000,
  95,
  now() - interval '45 minutes'
FROM pharmacies p
INNER JOIN gardes g ON g.pharmacy_id = p.id
  AND CURRENT_DATE BETWEEN g.start_date AND g.end_date
ORDER BY p.name ASC
LIMIT 3;
