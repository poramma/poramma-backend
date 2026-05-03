CREATE SCHEMA "identity";
CREATE TABLE "identity"."otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code_hash" varchar(255) NOT NULL,
	"channel" varchar(10) NOT NULL,
	"purpose" varchar(20) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp
);
CREATE TABLE "identity"."sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token_hash" varchar(255) NOT NULL,
	"ip" varchar(100),
	"user_agent" text,
	"created_at" timestamp DEFAULT now(),
	"revoked_at" timestamp
);
CREATE TABLE "identity"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false,
	"status" varchar(20) DEFAULT 'UNVERIFIED',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
