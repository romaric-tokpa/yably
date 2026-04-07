-- E-mail utilisateur : métadonnée d’inscription + colonne profiles.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);

COMMENT ON COLUMN public.profiles.email IS 'E-mail saisi à l’inscription (copie des métadonnées utilisateur).';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display VARCHAR(100);
  v_email VARCHAR(255);
BEGIN
  PERFORM set_config('row_security', 'off', true);

  v_display := TRIM(
    COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' ||
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  v_display := LEFT(v_display, 100);
  IF v_display = '' THEN
    v_display := NULL;
  END IF;

  v_email := TRIM(LOWER(COALESCE(NEW.raw_user_meta_data->>'email', '')));
  IF v_email = '' THEN
    v_email := NULL;
  ELSE
    v_email := LEFT(v_email, 255);
  END IF;

  INSERT INTO public.profiles (id, phone, display_name, email)
  VALUES (NEW.id, NEW.phone, v_display, v_email);
  RETURN NEW;
END;
$$;
