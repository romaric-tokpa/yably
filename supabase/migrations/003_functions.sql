-- Fonctions utilitaires specs.md §2.8 et trigger specs.md §3.2
-- Le filtre distance reprend la logique du HAVING des specs (WHERE sur sous-requête : SQL PostgreSQL valide).

CREATE OR REPLACE FUNCTION public.get_pharmacies_de_garde(
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
    q.id,
    q.name,
    q.address,
    q.commune,
    q.latitude,
    q.longitude,
    q.phone_primary,
    q.phone_secondary,
    q.pharmacist_name,
    q.photo_url,
    q.accepted_insurance,
    q.accepted_mobile_money,
    q.rating,
    q.review_count,
    q.is_24h,
    q.distance_km,
    q.duration_min,
    q.verification_count,
    q.last_verification,
    q.last_verification_status,
    q.avg_wait_time
  FROM (
    SELECT
      p.id,
      p.name,
      p.address,
      p.commune,
      p.latitude,
      p.longitude,
      p.phone_primary,
      p.phone_secondary,
      p.pharmacist_name,
      p.photo_url,
      p.accepted_insurance,
      p.accepted_mobile_money,
      p.rating,
      p.review_count,
      g.is_24h,
      ROUND(
        (6371 * acos(
          cos(radians(user_lat)) * cos(radians(p.latitude)) *
          cos(radians(p.longitude) - radians(user_lng)) +
          sin(radians(user_lat)) * sin(radians(p.latitude))
        ))::DECIMAL,
        1
      ) AS distance_km,
      ROUND(
        (6371 * acos(
          cos(radians(user_lat)) * cos(radians(p.latitude)) *
          cos(radians(p.longitude) - radians(user_lng)) +
          sin(radians(user_lat)) * sin(radians(p.latitude))
        )) / 20 * 60
      )::INTEGER AS duration_min,
      (
        SELECT COUNT(*) FROM verifications v
        WHERE v.pharmacy_id = p.id
          AND v.created_at > now() - interval '2 hours'
      ) AS verification_count,
      (
        SELECT v.created_at FROM verifications v
        WHERE v.pharmacy_id = p.id
        ORDER BY v.created_at DESC
        LIMIT 1
      ) AS last_verification,
      (
        SELECT v.status FROM verifications v
        WHERE v.pharmacy_id = p.id
        ORDER BY v.created_at DESC
        LIMIT 1
      ) AS last_verification_status,
      NULL::INTEGER AS avg_wait_time
    FROM pharmacies p
    INNER JOIN gardes g ON g.pharmacy_id = p.id
    WHERE p.is_active = true
      AND CURRENT_DATE BETWEEN g.start_date AND g.end_date
  ) AS q
  WHERE q.distance_km <= max_distance_km
  ORDER BY q.distance_km ASC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.add_verification(
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
  SELECT latitude, longitude INTO v_pharmacy FROM pharmacies WHERE id = p_pharmacy_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pharmacie introuvable');
  END IF;

  v_distance := ROUND(
    6371000 * acos(
      cos(radians(p_user_lat)) * cos(radians(v_pharmacy.latitude)) *
      cos(radians(v_pharmacy.longitude) - radians(p_user_lng)) +
      sin(radians(p_user_lat)) * sin(radians(v_pharmacy.latitude))
    )
  );

  IF v_distance > 500 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vous devez être à proximité de la pharmacie');
  END IF;

  SELECT COUNT(*) INTO v_recent_count FROM verifications
  WHERE pharmacy_id = p_pharmacy_id
    AND user_id = p_user_id
    AND created_at > now() - interval '2 hours';

  IF v_recent_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vous avez déjà vérifié cette pharmacie récemment');
  END IF;

  INSERT INTO verifications (pharmacy_id, user_id, status, user_latitude, user_longitude, distance_to_pharmacy)
  VALUES (p_pharmacy_id, p_user_id, p_status, p_user_lat, p_user_lng, v_distance);

  v_points := CASE WHEN p_status = 'open' THEN 5 ELSE 3 END;
  UPDATE profiles SET points = points + v_points WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'points_earned', v_points, 'distance', v_distance);
END;
$$ LANGUAGE plpgsql;

-- RLS sur profiles : pas de politique INSERT pour les rôles clients ; le trigger doit pouvoir insérer.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);
  INSERT INTO public.profiles (id, phone)
  VALUES (NEW.id, NEW.phone);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Signatures internes PostgreSQL : DECIMAL → numeric, VARCHAR → character varying
GRANT EXECUTE ON FUNCTION public.get_pharmacies_de_garde(numeric, numeric, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_verification(uuid, uuid, character varying, numeric, numeric) TO authenticated;
