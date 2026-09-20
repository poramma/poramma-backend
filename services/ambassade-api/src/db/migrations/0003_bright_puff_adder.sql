CREATE TABLE "ambassade"."agent_availabilities" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time,
	"end_time" time,
	"is_available" boolean DEFAULT true,
	"valid_from" date,
	"valid_until" date
);
--> statement-breakpoint
CREATE TABLE "ambassade"."agent_exceptions" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" uuid NOT NULL,
	"date" date NOT NULL,
	"type" varchar(20) NOT NULL,
	"reason" text NOT NULL,
	"is_full_day" boolean DEFAULT true,
	"start_time" time,
	"end_time" time,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ambassade"."agent_service_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" uuid NOT NULL,
	"sub_service_id" text NOT NULL,
	"assigned_by" uuid,
	"assigned_at" timestamp DEFAULT now(),
	"valid_from" date,
	"valid_until" date,
	"is_primary" boolean DEFAULT false,
	"max_daily_appointments" integer,
	"notes" text,
	"active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "ambassade"."daily_schedule_prints" (
	"id" text PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"agent_id" uuid,
	"sub_service_id" text,
	"printed_by" uuid NOT NULL,
	"printed_at" timestamp DEFAULT now(),
	"format" varchar(10) DEFAULT 'PDF' NOT NULL,
	"content" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'GENERATED' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ambassade"."rendez_vous" (
	"id" text PRIMARY KEY NOT NULL,
	"demande_id" text,
	"user_id" uuid NOT NULL,
	"sub_service_id" text NOT NULL,
	"agent_id" uuid NOT NULL,
	"slot_id" text,
	"date" date NOT NULL,
	"ticket_id" varchar(50) NOT NULL,
	"type" varchar(20) DEFAULT 'STANDARD' NOT NULL,
	"status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"motif" text,
	"is_urgent" boolean DEFAULT false,
	"urgence_justification" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"reminded_at" timestamp,
	"checked_in_at" timestamp,
	"completed_at" timestamp,
	CONSTRAINT "rendez_vous_ticket_id_unique" UNIQUE("ticket_id")
);
--> statement-breakpoint
ALTER TABLE "ambassade"."agent_service_assignments" ADD CONSTRAINT "agent_service_assignments_sub_service_id_sub_services_id_fk" FOREIGN KEY ("sub_service_id") REFERENCES "ambassade"."sub_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassade"."rendez_vous" ADD CONSTRAINT "rendez_vous_demande_id_demandes_id_fk" FOREIGN KEY ("demande_id") REFERENCES "ambassade"."demandes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassade"."rendez_vous" ADD CONSTRAINT "rendez_vous_sub_service_id_sub_services_id_fk" FOREIGN KEY ("sub_service_id") REFERENCES "ambassade"."sub_services"("id") ON DELETE no action ON UPDATE no action;