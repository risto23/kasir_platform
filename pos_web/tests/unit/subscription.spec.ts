import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { api } from '../../src/lib/api';
import {
  cancelSubscription,
  changeSubscriptionPlan,
  getCurrentSubscription,
  getSubscriptionChangePreview,
  getSubscriptionInvoiceDetail,
  getSubscriptionInvoices,
  getSubscriptionPlans,
  getSubscriptionUsage,
  recordSubscriptionInvoicePayment,
  reactivateSubscription,
  startSubscription,
} from '../../src/lib/subscription';

type ApiMock = {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

describe('subscription api helpers', () => {
  const apiMock = api as unknown as ApiMock;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads subscription plans from the billing endpoint', async () => {
    apiMock.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'plan-1',
            code: 'BASIC',
            name: 'Basic',
            description: null,
            monthlyPrice: 299000,
            currencyCode: 'IDR',
            businessType: 'RETAIL',
            isCustomPricing: false,
            isActive: true,
            limits: {
              maxOutlets: 2,
              maxUsers: 8,
              maxProducts: 500,
              maxMonthlyTransactions: 5000,
            },
          },
        ],
      },
    });

    const result = await getSubscriptionPlans();

    expect(apiMock.get).toHaveBeenCalledWith('/subscriptions/plans');
    expect(result[0]?.code).toBe('BASIC');
  });

  it('loads current subscription and usage', async () => {
    apiMock.get
      .mockResolvedValueOnce({
        data: {
          data: {
            subscriptionId: 'sub-1',
            businessId: 'biz-1',
            status: 'ACTIVE',
            startedAt: '2026-05-01T00:00:00.000Z',
            currentPeriodStart: '2026-05-01T00:00:00.000Z',
            currentPeriodEnd: '2026-05-31T23:59:59.999Z',
            trialEndsAt: null,
            graceEndsAt: null,
            cancelAtPeriodEnd: false,
            cancelledAt: null,
            suspendedAt: null,
            isInGracePeriod: false,
            plan: {
              id: 'plan-1',
              code: 'BASIC',
              name: 'Basic',
              description: null,
              monthlyPrice: 299000,
              currencyCode: 'IDR',
              businessType: 'RETAIL',
              isCustomPricing: false,
              isActive: true,
              limits: {
                maxOutlets: 2,
                maxUsers: 8,
                maxProducts: 500,
                maxMonthlyTransactions: 5000,
              },
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            businessId: 'biz-1',
            yearMonth: '2026-05',
            subscriptionStatus: 'ACTIVE',
            plan: {
              id: 'plan-1',
              code: 'BASIC',
              name: 'Basic',
              description: null,
              monthlyPrice: 299000,
              currencyCode: 'IDR',
              businessType: 'RETAIL',
              isCustomPricing: false,
              isActive: true,
              limits: {
                maxOutlets: 2,
                maxUsers: 8,
                maxProducts: 500,
                maxMonthlyTransactions: 5000,
              },
            },
            usage: {
              outlets: 1,
              users: 4,
              products: 20,
              monthlyTransactions: 10,
            },
            remaining: {
              outlets: 1,
              users: 4,
              products: 480,
              monthlyTransactions: 4990,
            },
          },
        },
      });

    const current = await getCurrentSubscription();
    const usage = await getSubscriptionUsage();

    expect(apiMock.get).toHaveBeenNthCalledWith(1, '/subscriptions/current');
    expect(apiMock.get).toHaveBeenNthCalledWith(2, '/subscriptions/usage');
    expect(current.status).toBe('ACTIVE');
    expect(usage.usage.products).toBe(20);
  });

  it('loads invoice list and detail', async () => {
    apiMock.get
      .mockResolvedValueOnce({
        data: {
          data: {
            items: [
              {
                id: 'invoice-1',
                invoiceNumber: 'SINV-202606-0001',
                subscriptionId: 'sub-1',
                billingPeriodStart: '2026-06-01T00:00:00.000Z',
                billingPeriodEnd: '2026-06-30T23:59:59.999Z',
                subtotal: 299000,
                taxAmount: 0,
                totalAmount: 299000,
                status: 'ISSUED',
                dueDate: '2026-05-31T23:59:59.999Z',
                issuedAt: '2026-05-24T10:00:00.000Z',
                paidAt: null,
                voidedAt: null,
                payments: [],
              },
            ],
            meta: {
              page: 1,
              perPage: 10,
              total: 1,
              totalPages: 1,
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            id: 'invoice-1',
            invoiceNumber: 'SINV-202606-0001',
            subscriptionId: 'sub-1',
            billingPeriodStart: '2026-06-01T00:00:00.000Z',
            billingPeriodEnd: '2026-06-30T23:59:59.999Z',
            subtotal: 299000,
            taxAmount: 0,
            totalAmount: 299000,
            status: 'ISSUED',
            dueDate: '2026-05-31T23:59:59.999Z',
            issuedAt: '2026-05-24T10:00:00.000Z',
            paidAt: null,
            voidedAt: null,
            payments: [
              {
                id: 'payment-1',
                method: 'TRANSFER',
                amount: 299000,
                status: 'PENDING',
                referenceNumber: 'SUB-REF-1',
                paidAt: null,
              },
            ],
          },
        },
      });

    const list = await getSubscriptionInvoices({ page: 1, perPage: 10 });
    const detail = await getSubscriptionInvoiceDetail('invoice-1');

    expect(apiMock.get).toHaveBeenNthCalledWith(1, '/subscriptions/invoices', {
      params: {
        page: 1,
        perPage: 10,
      },
    });
    expect(apiMock.get).toHaveBeenNthCalledWith(2, '/subscriptions/invoices/invoice-1');
    expect(list.items[0]?.invoiceNumber).toBe('SINV-202606-0001');
    expect(detail.payments[0]?.referenceNumber).toBe('SUB-REF-1');
  });

  it('loads plan change preview and submits plan change', async () => {
    apiMock.get.mockResolvedValueOnce({
      data: {
        data: {
          businessId: 'biz-1',
          subscriptionId: 'sub-1',
          currentPlan: {
            id: 'plan-basic',
            code: 'BASIC',
            name: 'Basic',
            description: null,
            monthlyPrice: 299000,
            currencyCode: 'IDR',
            businessType: 'RETAIL',
            isCustomPricing: false,
            isActive: true,
            limits: {
              maxOutlets: 2,
              maxUsers: 8,
              maxProducts: 500,
              maxMonthlyTransactions: 5000,
            },
          },
          targetPlan: {
            id: 'plan-business',
            code: 'BUSINESS',
            name: 'Business',
            description: null,
            monthlyPrice: 1299000,
            currencyCode: 'IDR',
            businessType: null,
            isCustomPricing: false,
            isActive: true,
            limits: {
              maxOutlets: 10,
              maxUsers: 30,
              maxProducts: 20000,
              maxMonthlyTransactions: 50000,
            },
          },
          currentStatus: 'ACTIVE',
          changeType: 'UPGRADE',
          effectiveAt: '2026-05-20T10:00:00.000Z',
          isImmediate: true,
          usage: {
            outlets: 1,
            users: 4,
            products: 20,
            monthlyTransactions: 10,
          },
          violations: [],
          canProceed: true,
          note: 'Upgrade diterapkan langsung tanpa mengubah periode billing berjalan.',
        },
      },
    });
    apiMock.post.mockResolvedValueOnce({
      data: {
        data: {
          businessId: 'biz-1',
          subscriptionId: 'sub-1',
          changeType: 'UPGRADE',
          effectiveAt: '2026-05-20T10:00:00.000Z',
          isImmediate: true,
          status: 'ACTIVE',
          currentPlan: {
            id: 'plan-basic',
            code: 'BASIC',
            name: 'Basic',
            description: null,
            monthlyPrice: 299000,
            currencyCode: 'IDR',
            businessType: 'RETAIL',
            isCustomPricing: false,
            isActive: true,
            limits: {
              maxOutlets: 2,
              maxUsers: 8,
              maxProducts: 500,
              maxMonthlyTransactions: 5000,
            },
          },
          targetPlan: {
            id: 'plan-business',
            code: 'BUSINESS',
            name: 'Business',
            description: null,
            monthlyPrice: 1299000,
            currencyCode: 'IDR',
            businessType: null,
            isCustomPricing: false,
            isActive: true,
            limits: {
              maxOutlets: 10,
              maxUsers: 30,
              maxProducts: 20000,
              maxMonthlyTransactions: 50000,
            },
          },
          scheduleChange: {
            id: 'change-1',
            status: 'APPLIED',
            effectiveAt: '2026-05-20T10:00:00.000Z',
          },
          message: 'Upgrade plan berhasil diterapkan langsung.',
        },
      },
    });

    const preview = await getSubscriptionChangePreview('BUSINESS');
    const result = await changeSubscriptionPlan('BUSINESS');

    expect(apiMock.get).toHaveBeenCalledWith('/subscriptions/change-preview', {
      params: {
        targetPlanCode: 'BUSINESS',
      },
    });
    expect(apiMock.post).toHaveBeenCalledWith('/subscriptions/change-plan', {
      targetPlanCode: 'BUSINESS',
    });
    expect(preview.changeType).toBe('UPGRADE');
    expect(result.scheduleChange?.status).toBe('APPLIED');
  });

  it('records manual invoice payment from billing page', async () => {
    apiMock.post.mockResolvedValueOnce({
      data: {
        data: {
          businessId: 'biz-1',
          subscriptionId: 'sub-1',
          invoiceId: 'invoice-1',
          invoiceNumber: 'SINV-202606-0001',
          invoiceStatus: 'PAID',
          paidAmount: 299000,
          totalPaidAmount: 299000,
          outstandingAmount: 0,
          paidAt: '2026-06-10T10:00:00.000Z',
          payment: {
            id: 'sub-pay-1',
            method: 'TRANSFER',
            amount: 299000,
            status: 'PAID',
            referenceNumber: 'PAY-SUB-001',
            paidAt: '2026-06-10T10:00:00.000Z',
          },
          subscription: {
            status: 'ACTIVE',
            currentPeriodStart: '2026-06-01T00:00:00.000Z',
            currentPeriodEnd: '2026-06-30T23:59:59.999Z',
            graceEndsAt: null,
            suspendedAt: null,
          },
        },
      },
    });

    const result = await recordSubscriptionInvoicePayment({
      invoiceId: 'invoice-1',
      method: 'TRANSFER',
      amount: 299000,
      referenceNumber: 'PAY-SUB-001',
      paidAt: '2026-06-10T10:00:00.000Z',
    });

    expect(apiMock.post).toHaveBeenCalledWith('/subscriptions/invoices/invoice-1/payments', {
      method: 'TRANSFER',
      amount: 299000,
      referenceNumber: 'PAY-SUB-001',
      paidAt: '2026-06-10T10:00:00.000Z',
    });
    expect(result.invoiceStatus).toBe('PAID');
    expect(result.subscription.status).toBe('ACTIVE');
  });

  it('schedules cancellation and reactivates subscription lifecycle', async () => {
    apiMock.post
      .mockResolvedValueOnce({
        data: {
          data: {
            businessId: 'biz-1',
            subscriptionId: 'sub-1',
            action: 'CANCEL_AT_PERIOD_END',
            status: 'ACTIVE',
            effectiveAt: '2026-05-31T23:59:59.999Z',
            cancelAtPeriodEnd: true,
            currentPeriodEnd: '2026-05-31T23:59:59.999Z',
            message: 'Subscription berhasil dijadwalkan berhenti pada akhir periode aktif.',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            businessId: 'biz-1',
            subscriptionId: 'sub-1',
            action: 'REACTIVATE',
            status: 'ACTIVE',
            effectiveAt: '2026-05-20T10:00:00.000Z',
            cancelAtPeriodEnd: false,
            currentPeriodEnd: '2026-05-31T23:59:59.999Z',
            message: 'Jadwal penghentian subscription berhasil dibatalkan.',
          },
        },
      });

    const cancelResult = await cancelSubscription();
    const reactivateResult = await reactivateSubscription();

    expect(apiMock.post).toHaveBeenNthCalledWith(1, '/subscriptions/cancel', {});
    expect(apiMock.post).toHaveBeenNthCalledWith(2, '/subscriptions/reactivate', {});
    expect(cancelResult.cancelAtPeriodEnd).toBe(true);
    expect(reactivateResult.action).toBe('REACTIVATE');
  });

  it('starts a new subscription from the billing page flow', async () => {
    apiMock.post.mockResolvedValueOnce({
      data: {
        data: {
          businessId: 'biz-1',
          subscriptionId: 'sub-new-1',
          status: 'ACTIVE',
          startedAt: '2026-05-20T10:00:00.000Z',
          currentPeriodStart: '2026-05-20T10:00:00.000Z',
          currentPeriodEnd: '2026-06-20T09:59:59.999Z',
          plan: {
            id: 'plan-business',
            code: 'BUSINESS',
            name: 'Business',
            description: null,
            monthlyPrice: 1299000,
            currencyCode: 'IDR',
            businessType: null,
            isCustomPricing: false,
            isActive: true,
            limits: {
              maxOutlets: 10,
              maxUsers: 30,
              maxProducts: 20000,
              maxMonthlyTransactions: 50000,
            },
          },
          invoice: {
            id: 'invoice-start-1',
            invoiceNumber: 'SINV-202605-0001',
            billingPeriodStart: '2026-05-20T10:00:00.000Z',
            billingPeriodEnd: '2026-06-20T09:59:59.999Z',
            dueDate: '2026-06-20T09:59:59.999Z',
            subtotal: 1299000,
            taxAmount: 0,
            totalAmount: 1299000,
            status: 'ISSUED',
          },
          message:
            'Subscription baru berhasil dimulai dan invoice awal sudah diterbitkan untuk periode berjalan.',
        },
      },
    });

    const result = await startSubscription('BUSINESS');

    expect(apiMock.post).toHaveBeenCalledWith('/subscriptions/start', {
      targetPlanCode: 'BUSINESS',
    });
    expect(result.status).toBe('ACTIVE');
    expect(result.invoice.invoiceNumber).toBe('SINV-202605-0001');
  });

  it('throws fallback error when response envelope is empty', async () => {
    apiMock.get.mockResolvedValueOnce({
      data: {},
    });

    await expect(getCurrentSubscription()).rejects.toThrow(
      'Subscription aktif tidak ditemukan',
    );
  });
});
