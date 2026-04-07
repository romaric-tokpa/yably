-- GoTrue mappe les colonnes token en string Go : NULL provoque
-- « Scan error ... confirmation_token: converting NULL to string is unsupported »
-- et une réponse 500 « Database error querying schema » sur /auth/v1/token.
-- Idempotent : sécurise les lignes issues d’anciens seeds ou d’insertions manuelles.

UPDATE auth.users
SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  phone_change = COALESCE(phone_change, ''),
  reauthentication_token = COALESCE(reauthentication_token, '');
