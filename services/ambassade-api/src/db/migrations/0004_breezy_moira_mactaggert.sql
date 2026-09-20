CREATE TABLE "ambassade"."rendez_vous_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"rendez_vous_id" text NOT NULL,
	"author_id" uuid NOT NULL,
	"author_name" varchar(255),
	"author_type" varchar(10) DEFAULT 'AGENT' NOT NULL,
	"content" text NOT NULL,
	"is_internal" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ambassade"."rendez_vous_notes" ADD CONSTRAINT "rendez_vous_notes_rendez_vous_id_rendez_vous_id_fk" FOREIGN KEY ("rendez_vous_id") REFERENCES "ambassade"."rendez_vous"("id") ON DELETE cascade ON UPDATE no action;