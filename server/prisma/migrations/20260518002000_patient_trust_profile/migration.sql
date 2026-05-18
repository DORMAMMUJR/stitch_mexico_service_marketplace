ALTER TABLE "Professional"
  ADD COLUMN "experienceYears" INTEGER,
  ADD COLUMN "certifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "associations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "emergencyDisclaimerAccepted" BOOLEAN NOT NULL DEFAULT false;
