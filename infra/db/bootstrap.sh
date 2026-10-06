#!/usr/bin/env bash
# Initialise une base Postgres VIERGE (ex. Render) : migrations identity +
# ambassade, seeds, puis remplacement du mot de passe de l'ADMIN seedé.
#
# Usage (depuis la racine du repo, avec psql et pnpm installés) :
#   DATABASE_URL="<External Database URL>" ADMIN_PASSWORD="<mot de passe fort>" \
#     bash infra/db/bootstrap.sh
#
# Refuse de s'exécuter sur une base déjà initialisée (schéma "identity" présent)
# pour ne jamais rejouer les seeds par erreur.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL (URL externe de la base) est requis}"
: "${ADMIN_PASSWORD:?ADMIN_PASSWORD est requis : le seed contient un mot de passe public connu, il doit être remplacé}"
if [ "${#ADMIN_PASSWORD}" -lt 12 ]; then
  echo "ADMIN_PASSWORD doit faire au moins 12 caractères" >&2
  exit 1
fi

cd "$(dirname "$0")/../.."
PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q)

if [ -n "$("${PSQL[@]}" -tA -c "SELECT to_regnamespace('identity')")" ]; then
  echo "Le schéma 'identity' existe déjà : base non vierge, abandon." >&2
  exit 1
fi

apply() {
  echo "-> $1"
  "${PSQL[@]}" -f "$1" > /dev/null
}

for f in services/identity-api/src/db/migrations/*.sql; do apply "$f"; done
for f in services/ambassade-api/src/db/migrations/*.sql; do apply "$f"; done

apply services/identity-api/src/db/seed.sql
apply services/identity-api/src/db/seed-culture-reception.sql
apply services/ambassade-api/src/db/seed.sql

echo "-> remplacement du mot de passe admin@poramma.ml"
HASH=$(cd services/identity-api && node -e 'process.stdout.write(require("bcryptjs").hashSync(process.env.ADMIN_PASSWORD, 10))')
"${PSQL[@]}" -v h="$HASH" > /dev/null <<'SQL'
UPDATE identity.users SET password_hash = :'h', updated_at = now() WHERE email = 'admin@poramma.ml';
SQL

echo "Base initialisée. Connexion : admin@poramma.ml avec le mot de passe fourni."
