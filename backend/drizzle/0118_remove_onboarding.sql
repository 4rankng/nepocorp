-- Remove only onboarding-owned state. Do not cascade into unrelated objects.
DROP TABLE "onboarding_events";--> statement-breakpoint
DROP TABLE "user_onboarding_progress";--> statement-breakpoint
DROP TABLE "user_onboarding_tasks";--> statement-breakpoint
DROP TYPE "public"."onboarding_status";--> statement-breakpoint
DROP TYPE "public"."onboarding_task_status";--> statement-breakpoint
DELETE FROM "app_settings" WHERE "setting_key" = 'onboarding.tutorial_enabled';
