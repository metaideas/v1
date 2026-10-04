ALTER TABLE "storage"."assets" RENAME TO "uploads";--> statement-breakpoint
ALTER TABLE "storage"."uploads" RENAME CONSTRAINT "assets_pkey" TO "uploads_pkey";--> statement-breakpoint
ALTER TABLE "storage"."uploads" RENAME CONSTRAINT "assets_uploader_id_users_id_fk" TO "uploads_uploader_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "storage"."uploads" RENAME CONSTRAINT "assets_owner_id_users_id_fk" TO "uploads_owner_id_users_id_fk";--> statement-breakpoint
ALTER INDEX "storage"."storage_assets_key_unique_idx" RENAME TO "storage_uploads_key_unique_idx";--> statement-breakpoint
ALTER INDEX "storage"."storage_assets_owner_id_idx" RENAME TO "storage_uploads_owner_id_idx";--> statement-breakpoint
ALTER INDEX "storage"."storage_assets_uploader_id_idx" RENAME TO "storage_uploads_uploader_id_idx";
