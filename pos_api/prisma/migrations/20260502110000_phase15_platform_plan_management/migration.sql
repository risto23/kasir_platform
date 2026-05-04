-- AlterTable
ALTER TABLE "plans"
ALTER COLUMN "code" TYPE TEXT
USING "code"::text;

-- DropEnum
DROP TYPE "PlanCode";

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");
