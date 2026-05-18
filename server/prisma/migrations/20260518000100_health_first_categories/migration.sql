-- Replace legacy marketplace categories with the health-first contract.
ALTER TYPE "Category" RENAME TO "Category_legacy";

CREATE TYPE "Category" AS ENUM ('PSYCHOLOGY', 'MEDICINE', 'WELLNESS');

ALTER TABLE "Professional"
  ALTER COLUMN "category" TYPE "Category"
  USING (
    CASE
      WHEN "category"::text = 'HEALTH_WELLNESS' THEN 'WELLNESS'
      ELSE 'PSYCHOLOGY'
    END
  )::"Category";

DROP TYPE "Category_legacy";
