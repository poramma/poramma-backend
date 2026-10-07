#!/usr/bin/env bash
# Met à niveau une base DÉJÀ initialisée (ex. Render) pour la séparation ambassade / communauté :
#   1. identity 0016  : roles.scope et permissions.scope
#   2. ambassade 0017 : audit_logs.domain (+ rattrapage de l'historique) et support_tickets.target
#   3. seed-community : rôles COMMUNITY_ADMIN / COMMUNITY_SUPPORT et leurs permissions
#
# À lancer AVANT de déployer le code correspondant : les migrations sont additives (colonnes avec
# valeur par défaut), l'ancien code continue donc de fonctionner pendant le déploiement.
# Idempotent : chaque étape est ignorée si elle est déjà appliquée ; peut être relancé sans risque.
#
# Usage (depuis la racine du repo) :
#   DATABASE_URL="<URL externe de la base>" bash infra/db/upgrade-community-separation.sh
# Base locale Docker : PSQL_DOCKER_CONTAINER=poramma-db PGUSER=poramma PGDATABASE=poramma bash ...
set -euo pipefail

if [ -z "${PSQL_DOCKER_CONTAINER:-}" ]; then : "${DATABASE_URL:?DATABASE_URL est requis (ou PSQL_DOCKER_CONTAINER)}"; fi
cd "$(dirname "$0")/../.."

if [ -n "${PSQL_DOCKER_CONTAINER:-}" ]; then
  PSQL=(docker exec -i "$PSQL_DOCKER_CONTAINER" psql -U "${PGUSER:-poramma}" -d "${PGDATABASE:-poramma}" -v ON_ERROR_STOP=1 -q -tA)
else
  PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -tA)
fi

has_column() { # schéma table colonne
  [ -n "$("${PSQL[@]}" -c "SELECT 1 FROM information_schema.columns WHERE table_schema='$1' AND table_name='$2' AND column_name='$3'")" ]
}
apply() { echo "-> $1"; "${PSQL[@]}" < "$1" > /dev/null; }

if [ -z "$("${PSQL[@]}" -c "SELECT to_regnamespace('identity')")" ]; then
  echo "Base non initialisée (schéma identity absent) : utilisez infra/db/bootstrap.sh." >&2
  exit 1
fi

if has_column identity roles scope; then echo "identity 0016 : déjà appliquée"; else apply services/identity-api/src/db/migrations/0016_community_scope.sql; fi
if has_column audit audit_logs domain; then echo "ambassade 0017 : déjà appliquée"; else apply services/ambassade-api/src/db/migrations/0017_audit_domain_support_target.sql; fi
apply services/identity-api/src/db/seed-community.sql   # idempotent (ON CONFLICT / NOT EXISTS)

echo
echo "Journal d'audit par domaine :"
"${PSQL[@]}" -F ' : ' -c "SELECT domain, count(*) FROM audit.audit_logs GROUP BY domain ORDER BY domain"
echo "Rôles de la communauté :"
"${PSQL[@]}" -F ' : ' -c "SELECT name, level FROM identity.roles WHERE scope='COMMUNITY' ORDER BY level"
echo "Mise à niveau terminée. Créez ensuite le premier administrateur : infra/db/create-community-admin.sh"
