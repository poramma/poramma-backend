CREATE TABLE "ambassade"."demande_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"demande_id" text NOT NULL,
	"author_id" uuid NOT NULL,
	"author_name" varchar(255),
	"author_type" varchar(10) DEFAULT 'AGENT' NOT NULL,
	"content" text NOT NULL,
	"is_internal" boolean DEFAULT true,
	"attachments" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ambassade"."demande_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"demande_id" text NOT NULL,
	"document_id" text NOT NULL,
	"requirement_id" text,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ambassade"."demande_histories" (
	"id" text PRIMARY KEY NOT NULL,
	"demande_id" text NOT NULL,
	"from_status" varchar(30),
	"to_status" varchar(30) NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"actor_role" varchar(50),
	"actor_name" varchar(255),
	"comment" text,
	"is_visible_to_user" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ambassade"."demande_requirements" (
	"id" text PRIMARY KEY NOT NULL,
	"demande_id" text NOT NULL,
	"requirement_id" text NOT NULL,
	"label" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"provided_value" text,
	"provided_document_id" text,
	"reviewer_note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ambassade"."demandes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"sub_service_id" text NOT NULL,
	"assigned_agent_id" uuid,
	"dossier_number" varchar(50) NOT NULL,
	"status" varchar(30) DEFAULT 'SUBMITTED' NOT NULL,
	"priority" varchar(10) DEFAULT 'NORMAL' NOT NULL,
	"total_amount" numeric(10, 2),
	"currency" varchar(10),
	"custom_payload" jsonb,
	"submitted_at" timestamp,
	"assigned_at" timestamp,
	"deadline_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "demandes_dossier_number_unique" UNIQUE("dossier_number")
);
--> statement-breakpoint
ALTER TABLE "ambassade"."demande_comments" ADD CONSTRAINT "demande_comments_demande_id_demandes_id_fk" FOREIGN KEY ("demande_id") REFERENCES "ambassade"."demandes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassade"."demande_documents" ADD CONSTRAINT "demande_documents_demande_id_demandes_id_fk" FOREIGN KEY ("demande_id") REFERENCES "ambassade"."demandes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassade"."demande_histories" ADD CONSTRAINT "demande_histories_demande_id_demandes_id_fk" FOREIGN KEY ("demande_id") REFERENCES "ambassade"."demandes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassade"."demande_requirements" ADD CONSTRAINT "demande_requirements_demande_id_demandes_id_fk" FOREIGN KEY ("demande_id") REFERENCES "ambassade"."demandes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassade"."demande_requirements" ADD CONSTRAINT "demande_requirements_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "ambassade"."requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassade"."demandes" ADD CONSTRAINT "demandes_sub_service_id_sub_services_id_fk" FOREIGN KEY ("sub_service_id") REFERENCES "ambassade"."sub_services"("id") ON DELETE no action ON UPDATE no action;