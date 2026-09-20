CREATE SCHEMA "ambassade";
--> statement-breakpoint
CREATE TABLE "ambassade"."requirements" (
	"id" text PRIMARY KEY NOT NULL,
	"sub_service_id" text NOT NULL,
	"type" varchar(20) NOT NULL,
	"label" varchar(255) NOT NULL,
	"key" varchar(100) NOT NULL,
	"description" text,
	"required" boolean DEFAULT true,
	"order" integer DEFAULT 0,
	"schema" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ambassade"."service_exceptions" (
	"id" text PRIMARY KEY NOT NULL,
	"sub_service_id" text NOT NULL,
	"date" date NOT NULL,
	"type" varchar(20) NOT NULL,
	"start_time" time,
	"end_time" time,
	"reason" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ambassade"."service_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"sub_service_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"slot_duration_minutes" integer DEFAULT 30 NOT NULL,
	"max_concurrent_slots" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true,
	"valid_from" date NOT NULL,
	"valid_until" date
);
--> statement-breakpoint
CREATE TABLE "ambassade"."services" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL,
	"description" text,
	"icon" varchar(100),
	"order" integer DEFAULT 0,
	"active" boolean DEFAULT true,
	"requires_appointment" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "services_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "ambassade"."sub_services" (
	"id" text PRIMARY KEY NOT NULL,
	"service_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL,
	"description" text,
	"active" boolean DEFAULT true,
	"base_price" numeric(10, 2),
	"currency" varchar(10) DEFAULT 'MAD',
	"sla_days" integer NOT NULL,
	"allow_custom_request" boolean DEFAULT false,
	"requires_in_person" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "sub_services_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "ambassade"."requirements" ADD CONSTRAINT "requirements_sub_service_id_sub_services_id_fk" FOREIGN KEY ("sub_service_id") REFERENCES "ambassade"."sub_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassade"."service_exceptions" ADD CONSTRAINT "service_exceptions_sub_service_id_sub_services_id_fk" FOREIGN KEY ("sub_service_id") REFERENCES "ambassade"."sub_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassade"."service_schedules" ADD CONSTRAINT "service_schedules_sub_service_id_sub_services_id_fk" FOREIGN KEY ("sub_service_id") REFERENCES "ambassade"."sub_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassade"."sub_services" ADD CONSTRAINT "sub_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "ambassade"."services"("id") ON DELETE cascade ON UPDATE no action;