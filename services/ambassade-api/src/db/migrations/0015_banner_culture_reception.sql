CREATE TABLE "ambassade"."culture_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"author_id" uuid,
	"author_type" varchar(10) NOT NULL,
	"author_name" varchar(150),
	"content" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ambassade"."culture_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"reference" varchar(30) NOT NULL,
	"user_id" uuid NOT NULL,
	"advisor_id" uuid,
	"subject" varchar(150) NOT NULL,
	"status" varchar(10) DEFAULT 'OPEN' NOT NULL,
	"last_message_at" timestamp DEFAULT now(),
	"last_message_by" varchar(10) DEFAULT 'USER' NOT NULL,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "culture_threads_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "ambassade"."walk_in_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"reference" varchar(30) NOT NULL,
	"visitor_name" varchar(150) NOT NULL,
	"visitor_phone" varchar(30),
	"user_id" uuid,
	"sub_service_id" text,
	"category" varchar(20) DEFAULT 'INFORMATION' NOT NULL,
	"subject" text NOT NULL,
	"notes" text,
	"status" varchar(20) DEFAULT 'WAITING' NOT NULL,
	"priority" varchar(10) DEFAULT 'NORMAL' NOT NULL,
	"assigned_agent_id" uuid,
	"demande_id" text,
	"rendez_vous_id" text,
	"outcome" text,
	"registered_by" uuid NOT NULL,
	"started_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "walk_in_requests_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "ambassade"."services" ADD COLUMN "is_cultural" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ambassade"."campagne_attachments" ADD COLUMN "is_banner" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ambassade"."culture_messages" ADD CONSTRAINT "culture_messages_thread_id_culture_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "ambassade"."culture_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassade"."walk_in_requests" ADD CONSTRAINT "walk_in_requests_sub_service_id_sub_services_id_fk" FOREIGN KEY ("sub_service_id") REFERENCES "ambassade"."sub_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassade"."walk_in_requests" ADD CONSTRAINT "walk_in_requests_demande_id_demandes_id_fk" FOREIGN KEY ("demande_id") REFERENCES "ambassade"."demandes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassade"."walk_in_requests" ADD CONSTRAINT "walk_in_requests_rendez_vous_id_rendez_vous_id_fk" FOREIGN KEY ("rendez_vous_id") REFERENCES "ambassade"."rendez_vous"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "culture_messages_thread_idx" ON "ambassade"."culture_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "culture_threads_status_idx" ON "ambassade"."culture_threads" USING btree ("status","last_message_at");--> statement-breakpoint
CREATE INDEX "culture_threads_user_idx" ON "ambassade"."culture_threads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "walk_in_requests_created_idx" ON "ambassade"."walk_in_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "walk_in_requests_status_idx" ON "ambassade"."walk_in_requests" USING btree ("status");