# Image du gateway pour Render — distincte du docker-compose local, qui
# utilise nginx:alpine tel quel avec nginx.conf monté en volume ("listen 80"
# en dur, fixe). Render impose le port d'écoute via $PORT, d'où ce gabarit
# substitué au démarrage (voir docker-entrypoint.sh).
FROM nginx:alpine

COPY infra/nginx/nginx.conf.template /etc/nginx/nginx.conf.template
COPY infra/nginx/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

CMD ["/docker-entrypoint.sh"]
