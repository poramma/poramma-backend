#!/usr/bin/env bash
# Met à niveau une base DÉJÀ initialisée pour la connexion avec Google : identity 0017
# (users.google_sub, users.password_set). Additif (colonne nullable + colonne à valeur par défaut) :
# l'ancien code continue de fonctionner. Idempotent.
#
# Usage (depuis la racine du repo) :
#   DATABASE_URL="<URL externe de la base>" bash infra/db/upgrade-google-auth.sh
# Base locale Docker : PSQL_DOCKER_CONTAINER=poramma-db PGUSER=poramma PGDATABASE=poramma bash ...
set -euo pipefail

if [ -z "${PSQL_DOCKER_CONTAINER:-}" ]; then : "${DATABASE_URL:?DATABASE_URL est requis (ou PSQL_DOCKER_CONTAINER)}"; fi
cd "$(dirname "$0")/../.."

if [ -n "${PSQL_DOCKER_CONTAINER:-}" ]; then
  PSQL=(docker exec -i "$PSQL_DOCKER_CONTAINER" psql -U "${PGUSER:-poramma}" -d "${PGDATABASE:-poramma}" -v ON_ERROR_STOP=1 -q -tA)
else
  PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -tA)
fi

if [ -z "$("${PSQL[@]}" -c "SELECT to_regnamespace('identity')")" ]; then
  echo "Base non initialisée (schéma identity absent) : utilisez infra/db/bootstrap.sh." >&2
  exit 1
fi

if [ -n "$("${PSQL[@]}" -c "SELECT 1 FROM information_schema.columns WHERE table_schema='identity' AND table_name='users' AND column_name='google_sub'")" ]; then
  echo "identity 0017 : déjà appliquée"
else
  echo "-> services/identity-api/src/db/migrations/0017_google_auth.sql"
  "${PSQL[@]}" < services/identity-api/src/db/migrations/0017_google_auth.sql > /dev/null
fi

"${PSQL[@]}" -F ' : ' -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='identity' AND table_name='users' AND column_name IN ('google_sub','password_set') ORDER BY 1"
echo "Mise à niveau terminée. Définissez ensuite GOOGLE_CLIENT_ID sur identity-api (voir docs de déploiement)."
