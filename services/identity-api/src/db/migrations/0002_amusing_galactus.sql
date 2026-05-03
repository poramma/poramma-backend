ALTER TABLE "identity"."otps" ADD COLUMN "email_phone" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "identity"."otps" DROP COLUMN "user_id";