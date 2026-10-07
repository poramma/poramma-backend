#!/usr/bin/env bash
# Crée (ou promeut) le PREMIER administrateur de la plateforme communautaire.
# Les suivants s'ajoutent depuis l'espace /admin/equipe du portail, par ce premier compte.
#
# Usage (depuis la racine du repo, avec psql et node) :
#   DATABASE_URL="<URL de la base>" COMMUNITY_ADMIN_EMAIL="prenom@exemple.org" \
#   COMMUNITY_ADMIN_PASSWORD="<mot de passe fort>" bash infra/db/create-community-admin.sh
# Facultatifs : COMMUNITY_ADMIN_FIRST_NAME, COMMUNITY_ADMIN_LAST_NAME.
#
# Base locale Docker (le port 5432 de l'hôte peut être pris par un Postgres Windows natif) :
#   PSQL_DOCKER_CONTAINER=poramma-db PGUSER=poramma PGDATABASE=poramma COMMUNITY_ADMIN_EMAIL=... bash infra/db/create-community-admin.sh
#
# Prérequis : migrations identity 0016 + seed-community.sql appliqués (rôle COMMUNITY_ADMIN).
# Refuse un compte du personnel de l'ambassade : les deux administrations ne se mélangent jamais.
# Idempotent : relancé sur un compte déjà administrateur, il ne fait rien.
set -euo pipefail

if [ -z "${PSQL_DOCKER_CONTAINER:-}" ]; then : "${DATABASE_URL:?DATABASE_URL est requis (ou PSQL_DOCKER_CONTAINER)}"; fi
: "${COMMUNITY_ADMIN_EMAIL:?COMMUNITY_ADMIN_EMAIL est requis}"
: "${COMMUNITY_ADMIN_PASSWORD:?COMMUNITY_ADMIN_PASSWORD est requis}"
if [ "${#COMMUNITY_ADMIN_PASSWORD}" -lt 12 ]; then
  echo "COMMUNITY_ADMIN_PASSWORD doit faire au moins 12 caractères" >&2
  exit 1
fi

cd "$(dirname "$0")/../.."
EMAIL=$(printf '%s' "$COMMUNITY_ADMIN_EMAIL" | tr '[:upper:]' '[:lower:]')
FIRST="${COMMUNITY_ADMIN_FIRST_NAME:-Administrateur}"
LAST="${COMMUNITY_ADMIN_LAST_NAME:-Communauté}"
if [ -n "${PSQL_DOCKER_CONTAINER:-}" ]; then
  PSQL=(docker exec -i "$PSQL_DOCKER_CONTAINER" psql -U "${PGUSER:-poramma}" -d "${PGDATABASE:-poramma}" -v ON_ERROR_STOP=1 -q -tA)
else
  PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -tA)
fi

ROLE=$("${PSQL[@]}" -c "SELECT id FROM identity.roles WHERE name = 'COMMUNITY_ADMIN' AND scope = 'COMMUNITY'")
if [ -z "$ROLE" ]; then
  echo "Rôle COMMUNITY_ADMIN introuvable : appliquez d'abord la migration identity 0016 et seed-community.sql." >&2
  exit 1
fi

EXISTING=$("${PSQL[@]}" -v e="$EMAIL" <<'SQL'
SELECT u.id || '|' ||
  (EXISTS (SELECT 1 FROM identity.agents a WHERE a.user_id = u.id))::text || '|' ||
  (EXISTS (SELECT 1 FROM identity.user_roles r WHERE r.user_id = u.id AND COALESCE(r.is_active, true)))::text
FROM identity.users u WHERE u.email = :'e';
SQL
)

if [ -n "$EXISTING" ]; then
  IFS='|' read -r UID_ IS_AGENT HAS_ROLE <<< "$EXISTING"
  if [ "$IS_AGENT" = "true" ]; then
    echo "Ce compte est du personnel de l'ambassade : il ne peut pas administrer la communauté." >&2
    exit 1
  fi
  if [ "$HAS_ROLE" = "true" ]; then
    echo "Ce compte a déjà un rôle actif : rien à faire (ou retirez-le d'abord depuis /admin/equipe)."
    exit 0
  fi
  echo "Compte existant : attribution du rôle COMMUNITY_ADMIN (mot de passe inchangé)."
else
  HASH=$(cd services/identity-api && node -e 'process.stdout.write(require("bcryptjs").hashSync(process.env.COMMUNITY_ADMIN_PASSWORD, 10))')
  UID_=$("${PSQL[@]}" -v e="$EMAIL" -v h="$HASH" -v f="$FIRST" -v l="$LAST" <<'SQL'
WITH u AS (
  INSERT INTO identity.users (id, email, password_hash, email_verified, status)
  VALUES (gen_random_uuid(), :'e', :'h', true, 'VERIFIED') RETURNING id
), p AS (
  INSERT INTO identity.user_profiles (id, user_id, user_type, first_name, last_name)
  SELECT gen_random_uuid(), u.id, 'other', :'f', :'l' FROM u RETURNING user_id
)
SELECT id FROM u;
SQL
  )
  echo "Compte créé."
fi

"${PSQL[@]}" -v u="$UID_" -v r="$ROLE" >/dev/null <<'SQL'
INSERT INTO identity.user_roles (id, user_id, role_id, assigned_by, is_active)
VALUES (gen_random_uuid(), :'u'::uuid, :'r'::uuid, :'u'::uuid, true);
SQL
echo "Administrateur de la communauté prêt : $EMAIL"
