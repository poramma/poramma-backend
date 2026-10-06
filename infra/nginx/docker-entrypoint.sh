#!/bin/sh
# Render impose le port d'écoute via $PORT (contrairement au docker-compose
# local, qui monte nginx.conf tel quel avec "listen 80" en dur) — on
# substitue cette variable, et l'adresse du résolveur DNS interne (lue dans
# /etc/resolv.conf : seul moyen fiable de l'obtenir, Render ne la documente
# pas comme une constante) dans le gabarit juste avant de démarrer.
set -e

: "${PORT:=80}"
RESOLVER_IP=$(awk '/^nameserver/{print $2; exit}' /etc/resolv.conf)
: "${RESOLVER_IP:=127.0.0.11}"

# Cibles des 3 API (host:port) — par défaut les noms du docker-compose ; sur
# Render, les surcharger avec l'adresse interne réelle de chaque service.
: "${IDENTITY_UPSTREAM:=identity-api:4001}"
: "${AMBASSADE_UPSTREAM:=ambassade-api:4002}"
: "${COMMUNAUTE_UPSTREAM:=communaute-api:4003}"
export PORT RESOLVER_IP IDENTITY_UPSTREAM AMBASSADE_UPSTREAM COMMUNAUTE_UPSTREAM

envsubst '$PORT $RESOLVER_IP $IDENTITY_UPSTREAM $AMBASSADE_UPSTREAM $COMMUNAUTE_UPSTREAM' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'
