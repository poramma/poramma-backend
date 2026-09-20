CREATE TABLE "identity"."agent_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_user_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"target_type" varchar(30) NOT NULL,
	"target_label" varchar(255) NOT NULL,
	"target_id" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "identity"."agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"matricule" varchar(50) NOT NULL,
	"role_title" varchar(255),
	"department" varchar(30) NOT NULL,
	"office_number" varchar(50),
	"signature_url" text,
	"signature_storage_key" text,
	"active" boolean DEFAULT true,
	"hired_at" timestamp NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "agents_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "agents_matricule_unique" UNIQUE("matricule")
);
--> statement-breakpoint
ALTER TABLE "identity"."agent_activities" ADD CONSTRAINT "agent_activities_agent_user_id_users_id_fk" FOREIGN KEY ("agent_user_id") REFERENCES "identity"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."agents" ADD CONSTRAINT "agents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE cascade ON UPDATE no action;