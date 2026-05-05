-- CreateTable
CREATE TABLE "business_feature_flag_overrides" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "featureFlagId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "reason" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_feature_flag_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_feature_flag_overrides_featureFlagId_idx" ON "business_feature_flag_overrides"("featureFlagId");

-- CreateIndex
CREATE INDEX "business_feature_flag_overrides_actorUserId_idx" ON "business_feature_flag_overrides"("actorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "business_feature_flag_overrides_businessId_featureFlagId_key" ON "business_feature_flag_overrides"("businessId", "featureFlagId");

-- AddForeignKey
ALTER TABLE "business_feature_flag_overrides" ADD CONSTRAINT "business_feature_flag_overrides_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_feature_flag_overrides" ADD CONSTRAINT "business_feature_flag_overrides_featureFlagId_fkey" FOREIGN KEY ("featureFlagId") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_feature_flag_overrides" ADD CONSTRAINT "business_feature_flag_overrides_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
