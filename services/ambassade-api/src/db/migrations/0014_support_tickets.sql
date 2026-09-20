CREATE TABLE "ambassade"."support_ticket_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"author_id" uuid,
	"author_type" varchar(10) NOT NULL,
	"author_name" varchar(150),
	"content" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ambassade"."support_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"reference" varchar(30) NOT NULL,
	"user_id" uuid NOT NULL,
	"category" varchar(20) NOT NULL,
	"subject" varchar(150) NOT NULL,
	"linked_reference" varchar(60),
	"status" varchar(20) DEFAULT 'OPEN' NOT NULL,
	"priority" varchar(10) DEFAULT 'NORMAL' NOT NULL,
	"assigned_to" uuid,
	"first_response_at" timestamp,
	"resolved_at" timestamp,
	"closed_at" timestamp,
	"last_message_at" timestamp DEFAULT now(),
	"last_message_by" varchar(10) DEFAULT 'USER' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "support_tickets_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "ambassade"."support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "ambassade"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_ticket_messages_ticket_idx" ON "ambassade"."support_ticket_messages" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "ambassade"."support_tickets" USING btree ("status","last_message_at");--> statement-breakpoint
CREATE INDEX "support_tickets_user_idx" ON "ambassade"."support_tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "support_tickets_assigned_idx" ON "ambassade"."support_tickets" USING btree ("assigned_to");