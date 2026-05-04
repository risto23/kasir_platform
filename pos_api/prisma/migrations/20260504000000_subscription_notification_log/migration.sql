-- CreateTable
CREATE TABLE "subscription_notification_logs" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipientEmail" TEXT NOT NULL,

    CONSTRAINT "subscription_notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_notification_logs_subscriptionId_notificationT_key" ON "subscription_notification_logs"("subscriptionId", "notificationType", "periodEnd");
