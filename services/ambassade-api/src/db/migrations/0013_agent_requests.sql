CREATE TABLE "ambassade"."agent_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"requester_user_id" uuid NOT NULL,
	"kind" varchar(20) NOT NULL,
	"category" varchar(30) NOT NULL,
	"subject" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"target_sub_service_id" text,
	"target_permission" varchar(100),
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"admin_response" text,
	"handled_by" uuid,
	"handled_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "agent_requests_status_idx" ON "ambassade"."agent_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "agent_requests_requester_idx" ON "ambassade"."agent_requests" USING btree ("requester_user_id");