-- CreateTable
CREATE TABLE "plan_feature_flags" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "featureFlagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_feature_flags_featureFlagId_idx" ON "plan_feature_flags"("featureFlagId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_feature_flags_planId_featureFlagId_key" ON "plan_feature_flags"("planId", "featureFlagId");

-- AddForeignKey
ALTER TABLE "plan_feature_flags" ADD CONSTRAINT "plan_feature_flags_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_feature_flags" ADD CONSTRAINT "plan_feature_flags_featureFlagId_fkey" FOREIGN KEY ("featureFlagId") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
