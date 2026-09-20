CREATE TABLE "ambassade"."messages" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"sender_id" uuid NOT NULL,
	"body" text NOT NULL,
	"attachments" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ambassade"."thread_participants" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'AGENT' NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"last_read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ambassade"."threads" (
	"id" text PRIMARY KEY NOT NULL,
	"demande_id" text,
	"subject" varchar(255) NOT NULL,
	"type" varchar(20) DEFAULT 'GENERAL' NOT NULL,
	"status" varchar(20) DEFAULT 'OPEN' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"closed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "ambassade"."messages" ADD CONSTRAINT "messages_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "ambassade"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassade"."thread_participants" ADD CONSTRAINT "thread_participants_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "ambassade"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambassade"."threads" ADD CONSTRAINT "threads_demande_id_demandes_id_fk" FOREIGN KEY ("demande_id") REFERENCES "ambassade"."demandes"("id") ON DELETE no action ON UPDATE no action;