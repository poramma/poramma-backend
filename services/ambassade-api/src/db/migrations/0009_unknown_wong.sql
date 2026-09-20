CREATE TABLE "ambassade"."etudiants" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"inue" varchar(20),
	"inue_assigned_at" timestamp,
	"inue_assigned_by" uuid,
	"review_note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "etudiants_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "etudiants_inue_unique" UNIQUE("inue")
);
--> statement-breakpoint
CREATE TABLE "ambassade"."inue_sequences" (
	"year" integer PRIMARY KEY NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL
);
