ALTER TABLE "ambassade"."rendez_vous" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ambassade"."rendez_vous" ADD COLUMN "visitor" jsonb;--> statement-breakpoint
ALTER TABLE "ambassade"."walk_in_requests" ADD COLUMN "redirected_sub_service_id" text;--> statement-breakpoint
ALTER TABLE "ambassade"."walk_in_requests" ADD CONSTRAINT "walk_in_requests_redirected_sub_service_id_sub_services_id_fk" FOREIGN KEY ("redirected_sub_service_id") REFERENCES "ambassade"."sub_services"("id") ON DELETE no action ON UPDATE no action;