-- Profil à l’inscription : prénom + nom (metadata) → display_name, téléphone inchangé.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display VARCHAR(100);
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

  INSERT INTO public.profiles (id, phone, display_name)
  VALUES (NEW.id, NEW.phone, v_display);
  RETURN NEW;
END;
$$;
