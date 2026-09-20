CREATE SCHEMA "audit";
--> statement-breakpoint
CREATE TABLE "ambassade"."campagne_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"campagne_id" text NOT NULL,
	"file_id" text NOT NULL,
	"type" varchar(20) NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"caption" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ambassade"."campagne_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"campagne_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'QUEUED' NOT NULL,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "ambassade"."campagnes" (
	"id" text PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"type" varchar(20) NOT NULL,
	"cover_image_id" text,
	"target_filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scheduled_at" timestamp,
	"sent_at" timestamp,
	"status" varchar(20) DEFAULT 'DRAFT' NOT NULL,
	"sent_by" uuid NOT NULL,
	"stats_total_recipients" integer DEFAULT 0 NOT NULL,
	"stats_sent" integer DEFAULT 0 NOT NULL,
	"stats_delivered" integer DEFAULT 0 NOT NULL,
	"stats_opened" integer DEFAULT 0 NOT NULL,
	"stats_clicked" integer DEFAULT 0 NOT NULL,
	"stats_failed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ambassade"."notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(30) NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"payload" jsonb,
	"channel" varchar(20) DEFAULT 'IN_APP' NOT NULL,
	"status" varchar(20) DEFAULT 'SENT' NOT NULL,
	"action_url" text,
	"created_at" timestamp DEFAULT now(),
	"sent_at" timestamp,
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audit"."audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"at" timestamp DEFAULT now() NOT NULL,
	"actor_user_id" uuid,
	"actor_role" varchar(50),
	"action" varchar(50) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" text NOT NULL,
	"entity_snapshot" jsonb,
	"result" varchar(20) DEFAULT 'SUCCESS' NOT NULL,
	"details" jsonb,
	"ip" varchar(64),
	"ua" text,
	"session_id" text,
	"severity" varchar(20) DEFAULT 'INFO' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ambassade"."campagne_attachments" ADD CONSTRAINT "campagne_attachments_campagne_id_campagnes_id_fk" FOREIGN KEY ("campagne_id") REFERENCES "ambassade"."campagnes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassade"."campagne_attachments" ADD CONSTRAINT "campagne_attachments_file_id_stored_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "ambassade"."stored_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassade"."campagne_deliveries" ADD CONSTRAINT "campagne_deliveries_campagne_id_campagnes_id_fk" FOREIGN KEY ("campagne_id") REFERENCES "ambassade"."campagnes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassade"."campagnes" ADD CONSTRAINT "campagnes_cover_image_id_stored_files_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "ambassade"."stored_files"("id") ON DELETE no action ON UPDATE no action;