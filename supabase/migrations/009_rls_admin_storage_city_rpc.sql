-- RLS : le claim JWT « role » vaut en général « authenticated », pas le rôle métier dans profiles.
-- Les écritures admin (pharmacies, gardes) doivent donc passer par profiles.role = 'admin'.

DROP POLICY IF EXISTS "pharmacies_write" ON public.pharmacies;
CREATE POLICY "pharmacies_write"
  ON public.pharmacies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "gardes_write" ON public.gardes;
CREATE POLICY "gardes_write"
  ON public.gardes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
  );

-- Suppression des vérifications côté interface admin
CREATE POLICY "verifications_delete_admin"
  ON public.verifications
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Storage : photos pharmacies (URL publiques comme dans l’admin)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('pharmacy-photos', 'pharmacy-photos', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "pharmacy_photos_select_public" ON storage.objects;
CREATE POLICY "pharmacy_photos_select_public"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'pharmacy-photos');

DROP POLICY IF EXISTS "pharmacy_photos_insert_admin" ON storage.objects;
CREATE POLICY "pharmacy_photos_insert_admin"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pharmacy-photos'
    AND EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "pharmacy_photos_update_admin" ON storage.objects;
CREATE POLICY "pharmacy_photos_update_admin"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'pharmacy-photos'
    AND EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'pharmacy-photos'
    AND EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "pharmacy_photos_delete_admin" ON storage.objects;
CREATE POLICY "pharmacy_photos_delete_admin"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pharmacy-photos'
    AND EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
  );

-- RPC : exposer city (saisie admin) côté mobile (signature du retour modifiée → DROP puis CREATE)
DROP FUNCTION IF EXISTS public.get_pharmacies_de_garde(numeric, numeric, integer);

CREATE FUNCTION public.get_pharmacies_de_garde(
  user_lat DECIMAL,
  user_lng DECIMAL,
  max_distance_km INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  address TEXT,
  commune VARCHAR,
  city VARCHAR,
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
DECLARE
  ref_pt geography;
BEGIN
  ref_pt := ST_SetSRID(
    ST_MakePoint(user_lng::double precision, user_lat::double precision),
    4326
  )::geography;

  RETURN QUERY
  SELECT
    q.id,
    q.name,
    q.address,
    q.commune,
    q.city,
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
      p.city,
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
        (ST_Distance(p.geom, ref_pt) / 1000.0)::numeric,
        1
      ) AS distance_km,
      ROUND(
        (ST_Distance(p.geom, ref_pt) / 1000.0 / 20.0 * 60.0)
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
      AND p.geom IS NOT NULL
      AND ST_DWithin(p.geom, ref_pt, max_distance_km * 1000)
  ) AS q
  ORDER BY q.distance_km ASC;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_pharmacies_de_garde(numeric, numeric, integer) TO anon, authenticated;
