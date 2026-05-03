ALTER TABLE "identity"."user_profiles" ALTER COLUMN "user_type" SET DEFAULT 'other';--> statement-breakpoint
ALTER TABLE "identity"."user_profiles" ALTER COLUMN "user_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "identity"."user_profiles" ALTER COLUMN "first_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "identity"."user_profiles" ALTER COLUMN "first_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "identity"."user_profiles" ALTER COLUMN "last_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "identity"."user_profiles" ALTER COLUMN "last_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "identity"."user_profiles" ALTER COLUMN "bio" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "identity"."user_profiles" ALTER COLUMN "address" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "identity"."user_profiles" ALTER COLUMN "city" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "identity"."user_profiles" ALTER COLUMN "country" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "identity"."user_profiles" ALTER COLUMN "zip_code" SET DATA TYPE varchar(20);