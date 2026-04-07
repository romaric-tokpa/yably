-- Token device Expo Push (specs §7 + demande produit)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_token TEXT;

COMMENT ON COLUMN profiles.push_token IS 'ExponentPushToken[...] pour notifications push (mise à jour côté app)';
