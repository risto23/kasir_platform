import type { BusinessType } from '@prisma/client';

export type PlatformPlanLimits = {
  maxOutlets: number | null;
  maxUsers: number | null;
  maxProducts: number | null;
  maxMonthlyTransactions: number | null;
};

export type PlatformPlanUsageSummary = {
  activeSubscriptionCount: number;
  businessCount: number;
};

export type PlatformPlanItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  currencyCode: string;
  businessType: BusinessType | null;
  isCustomPricing: boolean;
  isActive: boolean;
  limits: PlatformPlanLimits;
  usageSummary: PlatformPlanUsageSummary;
  createdAt: string;
  updatedAt: string;
};

export type CreatePlatformPlanInput = {
  code: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  businessType: BusinessType | null;
  maxOutlets: number | null;
  maxUsers: number | null;
  maxProducts: number | null;
  maxMonthlyTransactions: number | null;
  isCustomPricing: boolean;
};

export type UpdatePlatformPlanInput = {
  code?: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  businessType: BusinessType | null;
  maxOutlets: number | null;
  maxUsers: number | null;
  maxProducts: number | null;
  maxMonthlyTransactions: number | null;
  isCustomPricing: boolean;
};
