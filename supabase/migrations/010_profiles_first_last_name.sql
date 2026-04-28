-- Ajout prénom et nom explicites dans la table profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Mise à jour des profils existants
UPDATE public.profiles
SET 
  first_name = split_part(display_name, ' ', 1),
  last_name = substring(display_name from (length(split_part(display_name, ' ', 1)) + 2))
WHERE display_name IS NOT NULL AND first_name IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_name VARCHAR(100);
  v_last_name VARCHAR(100);
  v_display VARCHAR(100);
  v_email VARCHAR(255);
BEGIN
  PERFORM set_config('row_security', 'off', true);

  v_first_name := TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', ''));
  v_last_name := TRIM(COALESCE(NEW.raw_user_meta_data->>'last_name', ''));

  IF v_first_name = '' THEN v_first_name := NULL; END IF;
  IF v_last_name = '' THEN v_last_name := NULL; END IF;

  v_display := TRIM(COALESCE(v_first_name, '') || ' ' || COALESCE(v_last_name, ''));
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

  INSERT INTO public.profiles (id, phone, display_name, email, first_name, last_name)
  VALUES (NEW.id, NEW.phone, v_display, v_email, v_first_name, v_last_name);
  RETURN NEW;
END;
$$;
