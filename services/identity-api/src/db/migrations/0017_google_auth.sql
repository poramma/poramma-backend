ALTER TABLE "identity"."users" ADD COLUMN "google_sub" varchar(64);--> statement-breakpoint
ALTER TABLE "identity"."users" ADD COLUMN "password_set" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "identity"."users" ADD CONSTRAINT "users_google_sub_unique" UNIQUE("google_sub");