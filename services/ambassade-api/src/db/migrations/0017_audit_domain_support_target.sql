ALTER TABLE "audit"."audit_logs" ADD COLUMN "domain" varchar(12) DEFAULT 'EMBASSY' NOT NULL;--> statement-breakpoint
ALTER TABLE "ambassade"."support_tickets" ADD COLUMN "target" varchar(10) DEFAULT 'EMBASSY' NOT NULL;--> statement-breakpoint
CREATE INDEX "audit_logs_domain_at_idx" ON "audit"."audit_logs" USING btree ("domain","at");--> statement-breakpoint
CREATE INDEX "support_tickets_target_status_idx" ON "ambassade"."support_tickets" USING btree ("target","status","last_message_at");--> statement-breakpoint
-- Rattrapage de l'historique : une ligne dont l'acteur est un compte existant SANS fiche agent ni rôle actif
-- (donc un membre de la communauté) bascule dans le journal COMMUNITY. Les acteurs supprimés et les
-- tentatives anonymes restent EMBASSY : on ne retire jamais de visibilité à l'ambassade sur ce qu'on ne sait pas classer.
UPDATE "audit"."audit_logs" a SET "domain" = 'COMMUNITY'
WHERE a."actor_user_id" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "identity"."users" u WHERE u."id" = a."actor_user_id")
  AND NOT EXISTS (SELECT 1 FROM "identity"."agents" g WHERE g."user_id" = a."actor_user_id")
  AND NOT EXISTS (SELECT 1 FROM "identity"."user_roles" ur WHERE ur."user_id" = a."actor_user_id" AND COALESCE(ur."is_active", true));
