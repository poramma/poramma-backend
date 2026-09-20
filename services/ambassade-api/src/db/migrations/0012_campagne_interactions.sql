CREATE TABLE "ambassade"."campagne_interactions" (
	"id" text PRIMARY KEY NOT NULL,
	"campagne_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"target_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ambassade"."campagne_interactions" ADD CONSTRAINT "campagne_interactions_campagne_id_campagnes_id_fk" FOREIGN KEY ("campagne_id") REFERENCES "ambassade"."campagnes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campagne_interactions_campagne_type_idx" ON "ambassade"."campagne_interactions" USING btree ("campagne_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "campagne_interactions_reaction_uq" ON "ambassade"."campagne_interactions" USING btree ("campagne_id","user_id","type") WHERE "ambassade"."campagne_interactions"."type" in ('LIKE','PARTICIPATE');