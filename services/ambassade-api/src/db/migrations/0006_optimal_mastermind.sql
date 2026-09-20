CREATE TABLE "ambassade"."internal_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"file_id" text NOT NULL,
	"department" varchar(30) NOT NULL,
	"confidentiality" varchar(20) DEFAULT 'INTERNAL' NOT NULL,
	"target_role_ids" jsonb,
	"target_agent_ids" jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"archived_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "ambassade"."internal_documents" ADD CONSTRAINT "internal_documents_file_id_stored_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "ambassade"."stored_files"("id") ON DELETE no action ON UPDATE no action;