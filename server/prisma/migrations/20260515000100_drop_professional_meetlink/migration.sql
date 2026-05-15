-- Remove legacy professional-level video link. Video configuration is now per appointment.
ALTER TABLE "Professional" DROP COLUMN IF EXISTS "meetLink";
