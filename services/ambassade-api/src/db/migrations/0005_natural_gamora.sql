CREATE TABLE "ambassade"."document_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"document_kind" varchar(30) DEFAULT 'STUDENT_DOCUMENT' NOT NULL,
	"action" varchar(20) NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"actor_name" varchar(255),
	"actor_role" varchar(50),
	"ip_address" varchar(64),
	"user_agent" text,
	"details" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ambassade"."document_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL,
	"description" text,
	"allowed_types" jsonb NOT NULL,
	"requires_validation" boolean DEFAULT true,
	"max_versions" integer DEFAULT 3,
	"retention_days" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "document_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "ambassade"."document_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"file_id" text NOT NULL,
	"version" integer NOT NULL,
	"change_note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ambassade"."documents" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"type" varchar(30) NOT NULL,
	"category_id" text,
	"file_id" text NOT NULL,
	"status" varchar(20) DEFAULT 'UPLOADED' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"review_note" text,
	"expiry_date" date,
	"version" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ambassade"."stored_files" (
	"id" text PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"mime_type" varchar(150) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"size" integer NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"uploaded_at" timestamp DEFAULT now(),
	"expires_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "ambassade"."document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "ambassade"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassade"."document_versions" ADD CONSTRAINT "document_versions_file_id_stored_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "ambassade"."stored_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassade"."documents" ADD CONSTRAINT "documents_category_id_document_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "ambassade"."document_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassade"."documents" ADD CONSTRAINT "documents_file_id_stored_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "ambassade"."stored_files"("id") ON DELETE no action ON UPDATE no action;