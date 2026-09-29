import {
  getReceiptById,
  getReceiptByOrderId,
  softDeleteReceipt,
} from '../../../src/modules/receipts/receipt.service';

jest.mock('../../../src/config/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    receipt: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      update: jest.fn(),
    },
  },
}));

type PrismaMock = {
  prisma: {
    $transaction: jest.Mock;
    receipt: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    payment: {
      update: jest.Mock;
    };
  };
};

const scope = {
  businessId: 'cmomwnmoe000abcdefghijklm',
  outletId: 'cmomwnmoe000mfur0ue4mge5b',
};

describe('receipt.service not-found handling', () => {
  const { prisma } = jest.requireMock('../../../src/config/prisma') as PrismaMock;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('throws 404 when receipt belongs to another outlet', async () => {
    prisma.receipt.findFirst.mockResolvedValue(null);

    await expect(
      getReceiptById({ ...scope, receiptId: 'cmum6dxqd000abcdefghijklm' }),
    ).rejects.toMatchObject({ message: 'Receipt tidak ditemukan', statusCode: 404 });

    expect(prisma.receipt.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'cmum6dxqd000abcdefghijklm',
          businessId: scope.businessId,
          outletId: scope.outletId,
        },
      }),
    );
  });

  it('throws 404 when order has no receipt in this outlet', async () => {
    prisma.receipt.findFirst.mockResolvedValue(null);

    await expect(
      getReceiptByOrderId({ ...scope, orderId: 'cmum6dxqd000abcdefghijklm' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 404 when deleting a receipt outside the outlet', async () => {
    prisma.receipt.findFirst.mockResolvedValue(null);

    await expect(
      softDeleteReceipt({ ...scope, receiptId: 'cmum6dxqd000abcdefghijklm' }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
