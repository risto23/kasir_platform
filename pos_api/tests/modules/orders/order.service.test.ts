import { BusinessType, OrderStatus, OrderType, PaymentStatus } from '@prisma/client';
import {
  addOrderItem,
  createOrder,
  removeOrderItem,
  updateOrderItem,
  updateOrderStatus,
} from '../../../src/modules/orders/order.service';

jest.mock('../../../src/config/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

type OrderTransactionMock = {
  outlet: {
    findFirst: jest.Mock;
  };
  businessUser: {
    findFirst: jest.Mock;
  };
  outletTable: {
    findFirst: jest.Mock;
  };
  businessSubscription: {
    findFirst: jest.Mock;
  };
  payment: {
    count: jest.Mock;
  };
  order: {
    findFirst: jest.Mock;
    create: jest.Mock;
  };
};

type OrderPrismaMock = {
  prisma: {
    $transaction: jest.Mock;
  };
};

describe('order.service', () => {
  const prismaMock = jest.requireMock('../../../src/config/prisma') as OrderPrismaMock;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('blocks create order when monthly transaction limit is reached', async () => {
    const tx: OrderTransactionMock = {
      outlet: {
        findFirst: jest.fn().mockResolvedValueOnce({
          id: 'outlet-1',
          businessId: 'biz-1',
          name: 'Outlet 1',
          address: 'Jl. Test',
          business: {
            id: 'biz-1',
            name: 'Demo',
            businessType: BusinessType.RETAIL,
          },
        }),
      },
      businessUser: {
        findFirst: jest.fn().mockResolvedValueOnce({
          id: 'bu-1',
        }),
      },
      outletTable: {
        findFirst: jest.fn(),
      },
      businessSubscription: {
        findFirst: jest.fn().mockResolvedValueOnce({
          id: 'sub-1',
          status: 'ACTIVE',
          plan: {
            id: 'plan-1',
            code: 'BASIC',
            name: 'Basic',
            maxOutlets: 2,
            maxUsers: 10,
            maxProducts: 100,
            maxMonthlyTransactions: 10,
          },
        }),
      },
      payment: {
        count: jest.fn().mockResolvedValueOnce(10),
      },
      order: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    prismaMock.prisma.$transaction.mockImplementationOnce(
      async (callback: (reader: OrderTransactionMock) => Promise<unknown>) => callback(tx),
    );

    await expect(
      createOrder({
        businessId: 'biz-1',
        outletId: 'outlet-1',
        businessUserId: 'bu-1',
        notes: 'order baru',
        items: [],
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errors: {
        blockedAction: 'CREATE_ORDER',
        limit: 10,
        usage: 10,
      },
    });

    expect(tx.order.create).not.toHaveBeenCalled();
  });

  describe('paid order guards', () => {
    type PaidOrderTx = {
      order: { findFirst: jest.Mock; update: jest.Mock };
      orderItem: {
        create: jest.Mock;
        update: jest.Mock;
        delete: jest.Mock;
        findFirst: jest.Mock;
        updateMany: jest.Mock;
      };
    };

    function mockOrderTx(order: {
      status: OrderStatus;
      paymentStatus: PaymentStatus;
      orderType?: OrderType;
    }): PaidOrderTx {
      const tx: PaidOrderTx = {
        order: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'order-1',
            orderType: order.orderType ?? OrderType.DINE_IN,
            status: order.status,
            paymentStatus: order.paymentStatus,
          }),
          update: jest.fn(),
        },
        orderItem: {
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          findFirst: jest.fn(),
          updateMany: jest.fn(),
        },
      };

      prismaMock.prisma.$transaction.mockImplementationOnce(
        async (callback: (reader: PaidOrderTx) => Promise<unknown>) => callback(tx),
      );

      return tx;
    }

    const scope = { businessId: 'biz-1', outletId: 'outlet-1', orderId: 'order-1' };

    it('rejects adding items to a PAID dine-in order (no unbilled additions)', async () => {
      const tx = mockOrderTx({
        status: OrderStatus.IN_PROGRESS,
        paymentStatus: PaymentStatus.PAID,
      });

      await expect(
        addOrderItem({ ...scope, productId: 'product-1', quantity: 1 }),
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(tx.orderItem.create).not.toHaveBeenCalled();
    });

    it('rejects updating items on a PARTIAL order', async () => {
      const tx = mockOrderTx({
        status: OrderStatus.SUBMITTED,
        paymentStatus: PaymentStatus.PARTIAL,
      });

      await expect(
        updateOrderItem({ ...scope, itemId: 'item-1', quantity: 3 }),
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(tx.orderItem.update).not.toHaveBeenCalled();
    });

    it('rejects removing items from a PAID order', async () => {
      const tx = mockOrderTx({
        status: OrderStatus.SUBMITTED,
        paymentStatus: PaymentStatus.PAID,
      });

      await expect(
        removeOrderItem({ ...scope, itemId: 'item-1' }),
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(tx.orderItem.delete).not.toHaveBeenCalled();
    });

    it('rejects cancelling a PAID order (no refund flow)', async () => {
      const tx = mockOrderTx({
        status: OrderStatus.SUBMITTED,
        paymentStatus: PaymentStatus.PAID,
      });

      await expect(
        updateOrderStatus({ ...scope, status: OrderStatus.CANCELLED }),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Order yang sudah dibayar tidak bisa dibatalkan',
      });
      expect(tx.order.update).not.toHaveBeenCalled();
    });
  });
});
