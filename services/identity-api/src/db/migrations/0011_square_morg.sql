CREATE TABLE "identity"."permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"resource" varchar(50) NOT NULL,
	"action" varchar(50) NOT NULL,
	"category" varchar(100),
	"min_role_level" integer NOT NULL,
	CONSTRAINT "permissions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "identity"."role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
ALTER TABLE "identity"."roles" ADD COLUMN "level" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "identity"."roles" ADD COLUMN "is_system" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "identity"."user_roles" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "identity"."user_roles" ADD COLUMN "assigned_by" uuid;--> statement-breakpoint
ALTER TABLE "identity"."user_roles" ADD COLUMN "assigned_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "identity"."user_roles" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "identity"."user_roles" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "identity"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "identity"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "identity"."permissions"("id") ON DELETE cascade ON UPDATE no action;