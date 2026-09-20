mkdir -p poramma-backend/{infra/{initdb,nginx},services/{identity-api/src/{modules/{auth,users,otp,sessions},db/migrations,shared,config},ambassade-api/src/{modules/{demandes,rendezvous,payments,messaging},db/migrations,shared,config},communaute-api/src/{modules/{profiles,documents,inue},db/migrations,shared,config}},packages/{dto/src,types/src,utils/src,storage/src,queue/src,mailer/src,notifier/src},tests/{e2e,contracts}} && \
cd poramma-backend && \
touch package.json pnpm-workspace.yaml docker-compose.yml .env && \
touch infra/initdb/01-create-schemas.sql infra/nginx/nginx.conf && \
touch services/identity-api/{Dockerfile,.env} && \
touch services/identity-api/src/{app.ts,server.ts} && \
touch services/identity-api/src/modules/auth/{auth.controller.ts,auth.service.ts,auth.routes.ts,dto.ts} && \
touch services/identity-api/src/modules/users/{users.controller.ts,users.service.ts,users.routes.ts,dto.ts} && \
touch services/identity-api/src/modules/otp/{otp.controller.ts,otp.service.ts,otp.routes.ts,dto.ts} && \
touch services/identity-api/src/modules/sessions/{sessions.controller.ts,sessions.service.ts,sessions.routes.ts,dto.ts} && \
touch services/identity-api/src/db/{drizzle.config.ts,schema.identity.ts} && \
touch services/identity-api/src/shared/{middleware.ts,errors.ts,logger.ts,security.ts} && \
touch services/identity-api/src/config/{database.ts,redis.ts,app.ts} && \
touch services/ambassade-api/{Dockerfile,.env} && \
touch services/ambassade-api/src/{app.ts,server.ts} && \
touch services/ambassade-api/src/modules/demandes/{demandes.controller.ts,demandes.service.ts,demandes.routes.ts,dto.ts} && \
touch services/ambassade-api/src/modules/rendezvous/{rendezvous.controller.ts,rendezvous.service.ts,rendezvous.routes.ts,dto.ts} && \
touch services/ambassade-api/src/modules/payments/{payments.controller.ts,payments.service.ts,payments.routes.ts,dto.ts} && \
touch services/ambassade-api/src/modules/messaging/{messaging.controller.ts,messaging.service.ts,messaging.routes.ts,dto.ts} && \
touch services/ambassade-api/src/db/{drizzle.config.ts,schema.ambassade.ts} && \
touch services/ambassade-api/src/shared/{middleware.ts,errors.ts,logger.ts,security.ts} && \
touch services/ambassade-api/src/config/{database.ts,redis.ts,app.ts} && \
touch services/communaute-api/{Dockerfile,.env} && \
touch services/communaute-api/src/{app.ts,server.ts} && \
touch services/communaute-api/src/modules/profiles/{profiles.controller.ts,profiles.service.ts,profiles.routes.ts,dto.ts} && \
touch services/communaute-api/src/modules/documents/{documents.controller.ts,documents.service.ts,documents.routes.ts,dto.ts} && \
touch services/communaute-api/src/modules/inue/{inue.controller.ts,inue.service.ts,inue.routes.ts,dto.ts} && \
touch services/communaute-api/src/db/{drizzle.config.ts,schema.communaute.ts} && \
touch services/communaute-api/src/shared/{middleware.ts,errors.ts,logger.ts,security.ts} && \
touch services/communaute-api/src/config/{database.ts,redis.ts,app.ts} && \
touch packages/dto/src/index.ts packages/types/src/index.ts packages/utils/src/index.ts packages/storage/src/index.ts packages/queue/src/index.ts packages/mailer/src/index.ts packages/notifier/src/index.ts && \
touch packages/{dto,types,utils,storage,queue,mailer,notifier}/package.json && \
touch tests/e2e/setup.ts tests/contracts/pact.ts && \
echo "Arborescence créée avec succès !"