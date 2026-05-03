CREATE TABLE "identity"."otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_phone" varchar(255) NOT NULL,
	"code_hash" varchar(255) NOT NULL,
	"channel" varchar(10) NOT NULL,
	"purpose" varchar(20) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp
);
