ALTER TABLE "identity"."user_profiles" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "identity"."user_profiles" ADD COLUMN "birth_date" timestamp;--> statement-breakpoint
ALTER TABLE "identity"."user_profiles" ADD COLUMN "country" varchar(100);--> statement-breakpoint
ALTER TABLE "identity"."user_profiles" ADD COLUMN "zip_code" varchar(10);