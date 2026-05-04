-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('STARTER', 'BASIC', 'RESTAURANT', 'RETAIL_PRO', 'BUSINESS', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionInvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'VOID');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'VOID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SubscriptionScheduleChangeType" AS ENUM ('UPGRADE', 'DOWNGRADE');

-- CreateEnum
CREATE TYPE "SubscriptionScheduleChangeStatus" AS ENUM ('PENDING', 'APPLIED', 'CANCELLED', 'REJECTED');

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "code" "PlanCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPrice" DECIMAL(14,2) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'IDR',
    "businessType" "BusinessType",
    "maxOutlets" INTEGER,
    "maxUsers" INTEGER,
    "maxProducts" INTEGER,
    "maxMonthlyTransactions" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCustomPricing" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_subscriptions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "graceEndsAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_invoices" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "billingPeriodStart" TIMESTAMP(3) NOT NULL,
    "billingPeriodEnd" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "SubscriptionInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "referenceNumber" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_usage_monthly" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "outletCount" INTEGER NOT NULL DEFAULT 0,
    "userCount" INTEGER NOT NULL DEFAULT 0,
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_usage_monthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_schedule_changes" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "fromPlanId" TEXT NOT NULL,
    "toPlanId" TEXT NOT NULL,
    "type" "SubscriptionScheduleChangeType" NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "status" "SubscriptionScheduleChangeStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_schedule_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE INDEX "plans_businessType_isActive_idx" ON "plans"("businessType", "isActive");

-- CreateIndex
CREATE INDEX "business_subscriptions_businessId_status_idx" ON "business_subscriptions"("businessId", "status");

-- CreateIndex
CREATE INDEX "business_subscriptions_businessId_currentPeriodEnd_idx" ON "business_subscriptions"("businessId", "currentPeriodEnd");

-- CreateIndex
CREATE INDEX "business_subscriptions_planId_idx" ON "business_subscriptions"("planId");

-- CreateIndex
CREATE INDEX "subscription_invoices_businessId_status_dueDate_idx" ON "subscription_invoices"("businessId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "subscription_invoices_subscriptionId_status_idx" ON "subscription_invoices"("subscriptionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_businessId_invoiceNumber_key" ON "subscription_invoices"("businessId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_subscriptionId_billingPeriodStart_bil_key" ON "subscription_invoices"("subscriptionId", "billingPeriodStart", "billingPeriodEnd");

-- CreateIndex
CREATE INDEX "subscription_payments_invoiceId_status_idx" ON "subscription_payments"("invoiceId", "status");

-- CreateIndex
CREATE INDEX "subscription_payments_paidAt_idx" ON "subscription_payments"("paidAt");

-- CreateIndex
CREATE INDEX "subscription_usage_monthly_yearMonth_idx" ON "subscription_usage_monthly"("yearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_usage_monthly_businessId_yearMonth_key" ON "subscription_usage_monthly"("businessId", "yearMonth");

-- CreateIndex
CREATE INDEX "subscription_schedule_changes_businessId_status_effectiveAt_idx" ON "subscription_schedule_changes"("businessId", "status", "effectiveAt");

-- CreateIndex
CREATE INDEX "subscription_schedule_changes_subscriptionId_idx" ON "subscription_schedule_changes"("subscriptionId");

-- CreateIndex
CREATE INDEX "subscription_schedule_changes_fromPlanId_idx" ON "subscription_schedule_changes"("fromPlanId");

-- CreateIndex
CREATE INDEX "subscription_schedule_changes_toPlanId_idx" ON "subscription_schedule_changes"("toPlanId");

-- AddForeignKey
ALTER TABLE "business_subscriptions" ADD CONSTRAINT "business_subscriptions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_subscriptions" ADD CONSTRAINT "business_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "business_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "subscription_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_usage_monthly" ADD CONSTRAINT "subscription_usage_monthly_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_schedule_changes" ADD CONSTRAINT "subscription_schedule_changes_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_schedule_changes" ADD CONSTRAINT "subscription_schedule_changes_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "business_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_schedule_changes" ADD CONSTRAINT "subscription_schedule_changes_fromPlanId_fkey" FOREIGN KEY ("fromPlanId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_schedule_changes" ADD CONSTRAINT "subscription_schedule_changes_toPlanId_fkey" FOREIGN KEY ("toPlanId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
