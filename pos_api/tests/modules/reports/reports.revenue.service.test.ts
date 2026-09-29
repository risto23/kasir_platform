import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import {
  getOrdersReportService,
  getSalesSummaryService,
} from '../../../src/modules/reports/reports.service';

jest.mock('../../../src/config/prisma', () => ({
  prisma: {
    order: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

type ReportsPrismaMock = {
  prisma: {
    order: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };
};

describe('reports.service revenue & status filter', () => {
  const prismaMock = jest.requireMock('../../../src/config/prisma') as ReportsPrismaMock;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const baseParams = {
    businessId: 'biz-1',
    scope: 'outlet' as const,
    outletId: 'outlet-1',
    start: '2026-09-29',
    end: '2026-09-29',
  };

  it('excludes DRAFT and CANCELLED orders when orderStatus is ALL', async () => {
    prismaMock.prisma.order.findMany.mockResolvedValueOnce([]);

    await getSalesSummaryService({ ...baseParams, groupBy: 'day', orderStatus: 'ALL' });

    expect(prismaMock.prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          outletId: 'outlet-1',
          status: { notIn: [OrderStatus.DRAFT, OrderStatus.CANCELLED] },
        }),
      }),
    );
  });

  it('keeps an explicit status filter as-is', async () => {
    prismaMock.prisma.order.findMany.mockResolvedValueOnce([]);

    await getSalesSummaryService({ ...baseParams, groupBy: 'day', orderStatus: 'CANCELLED' });

    expect(prismaMock.prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: OrderStatus.CANCELLED }),
      }),
    );
  });

  it('computes revenue from collected PAID payments, not order totals', async () => {
    prismaMock.prisma.order.findMany.mockResolvedValueOnce([
      {
        id: 'order-1',
        createdAt: new Date('2026-09-29T05:00:00.000Z'),
        payments: [{ amountPaid: new Prisma.Decimal(9200) }],
      },
      {
        id: 'order-2',
        createdAt: new Date('2026-09-29T06:00:00.000Z'),
        payments: [],
      },
    ]);

    const result = await getSalesSummaryService({
      ...baseParams,
      groupBy: 'day',
      orderStatus: 'ALL',
    });

    expect(prismaMock.prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          payments: {
            where: { status: PaymentStatus.PAID, deletedAt: null },
            select: { amountPaid: true },
          },
        }),
      }),
    );
    expect(result.totalRevenue).toBe(9200);
    expect(result.totalOrders).toBe(2);
  });

  it('returns paidAmount per order in the orders report', async () => {
    prismaMock.prisma.order.count.mockResolvedValueOnce(1);
    prismaMock.prisma.order.findMany.mockResolvedValueOnce([
      {
        id: 'order-7',
        orderNumber: 'ORD-0007',
        outletId: 'outlet-1',
        totalAmount: new Prisma.Decimal(38200),
        paymentStatus: PaymentStatus.PAID,
        status: OrderStatus.SUBMITTED,
        createdAt: new Date('2026-09-29T05:00:00.000Z'),
        outlet: { name: 'Outlet Utama' },
        payments: [{ amountPaid: new Prisma.Decimal(9200) }],
      },
    ]);

    const result = await getOrdersReportService({
      ...baseParams,
      page: 1,
      perPage: 20,
      orderStatus: 'ALL',
    });

    expect(result.items[0]).toMatchObject({ totalAmount: 38200, paidAmount: 9200 });
  });
});
