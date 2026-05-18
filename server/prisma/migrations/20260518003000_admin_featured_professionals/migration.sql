ALTER TABLE "Professional"
  ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "featuredRank" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Professional_isFeatured_featuredRank_idx"
  ON "Professional"("isFeatured", "featuredRank");
