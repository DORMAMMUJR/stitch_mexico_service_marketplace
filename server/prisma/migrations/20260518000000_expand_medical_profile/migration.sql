ALTER TABLE "Professional"
  ADD COLUMN "treatedConditions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "officeAddress" TEXT,
  ADD COLUMN "serviceAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "presencialRate" DECIMAL(10, 2),
  ADD COLUMN "telemedicineRate" DECIMAL(10, 2),
  ADD COLUMN "homeVisitRate" DECIMAL(10, 2);
