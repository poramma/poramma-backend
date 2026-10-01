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
export PORT RESOLVER_IP

envsubst '$PORT $RESOLVER_IP' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'
