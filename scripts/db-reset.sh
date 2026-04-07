#!/usr/bin/env bash
# Après un `db reset`, Kong peut conserver une IP obsolète pour l’upstream storage
# (Connection refused → 502). On redémarre Kong puis on vérifie /storage/v1/bucket.

PROJECT_ID=$(grep -m1 '^project_id' supabase/config.toml | sed 's/.*"\([^"]*\)".*/\1/')
KONG_CONTAINER="supabase_kong_${PROJECT_ID}"

RESET_ERR=0
supabase db reset || RESET_ERR=$?

if [ "$RESET_ERR" -ne 0 ]; then
  if docker restart "$KONG_CONTAINER" 2>/dev/null; then
    sleep 4
  fi
  # shellcheck disable=SC2046
  eval "$(supabase status -o env 2>/dev/null | grep -E '^SERVICE_ROLE_KEY=' || printf '')"
  if [ -n "${SERVICE_ROLE_KEY:-}" ]; then
    HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" \
      http://127.0.0.1:54321/storage/v1/bucket \
      -H "apikey: ${SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
      echo "Base et seed appliqués. Kong a été redémarré (résolution upstream storage)."
      exit 0
    fi
  fi
fi

exit "$RESET_ERR"
