import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import { createReceiptForPaidOrder } from '../receipts/receipt.service';

function toMoneyString(value: Prisma.Decimal | number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return '0';
  }

  if (value instanceof Prisma.Decimal) {
    return value.toFixed(2);
  }

  return Number(value).toFixed(2);
}

async function generatePaymentNumber(tx: Prisma.TransactionClient): Promise<string> {
  const now = new Date();
  const prefix = `PAY-${now.getFullYear()}${`${now.getMonth() + 1}`.padStart(2, '0')}${`${now.getDate()}`.padStart(2, '0')}`;

  const latest = await tx.payment.findFirst({
    where: {
      paymentNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      paymentNumber: 'desc',
    },
    select: {
      paymentNumber: true,
    },
  });

  const latestSequence = latest?.paymentNumber
    ? Number(latest.paymentNumber.split('-').pop() ?? '0')
    : 0;

  return `${prefix}-${`${latestSequence + 1}`.padStart(4, '0')}`;
}

export async function createPayment(params: {
  businessId: string;
  outletId: string;
  businessUserId: string;
  orderId: string;
  method: PaymentMethod;
  amountPaid: number;
  amountTendered?: number;
  note?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: params.orderId,
        businessId: params.businessId,
        outletId: params.outletId,
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        totalAmount: true,
      },
    });

    if (!order) {
      throw new Error('Order tidak ditemukan');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new Error('Order yang dibatalkan tidak bisa dibayar');
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new Error('Order ini sudah dibayar');
    }

    const amountPaidDecimal = new Prisma.Decimal(params.amountPaid);
    const totalAmountDecimal = order.totalAmount;

    if (amountPaidDecimal.lessThan(totalAmountDecimal)) {
      throw new Error('Jumlah pembayaran kurang dari total order');
    }

    const amountTenderedDecimal =
      params.amountTendered !== undefined
        ? new Prisma.Decimal(params.amountTendered)
        : amountPaidDecimal;

    if (amountTenderedDecimal.lessThan(amountPaidDecimal)) {
      throw new Error('Amount tendered tidak boleh lebih kecil dari amount paid');
    }

    const changeAmount = amountTenderedDecimal.minus(amountPaidDecimal);
    const paymentNumber = await generatePaymentNumber(tx);
    const paidAt = new Date();

    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        businessId: params.businessId,
        outletId: params.outletId,
        receivedByBusinessUserId: params.businessUserId,
        paymentNumber,
        method: params.method,
        status: PaymentStatus.PAID,
        amountPaid: amountPaidDecimal,
        amountTendered: amountTenderedDecimal,
        changeAmount,
        note: params.note?.trim() || null,
        paidAt,
      },
    });

    await tx.order.update({
      where: {
        id: order.id,
      },
      data: {
        paymentStatus: PaymentStatus.PAID,
        status:
          order.status === OrderStatus.DRAFT ? OrderStatus.SUBMITTED : order.status,
        submittedAt: order.status === OrderStatus.DRAFT ? paidAt : undefined,
      },
    });

    const receipt = await createReceiptForPaidOrder({
      tx,
      orderId: order.id,
      paymentId: payment.id,
      businessId: params.businessId,
      outletId: params.outletId,
    });

    return {
      id: payment.id,
      paymentNumber: payment.paymentNumber,
      orderId: payment.orderId,
      businessId: payment.businessId,
      outletId: payment.outletId,
      method: payment.method,
      status: payment.status,
      amountPaid: toMoneyString(payment.amountPaid),
      amountTendered: toMoneyString(payment.amountTendered),
      changeAmount: toMoneyString(payment.changeAmount),
      note: payment.note,
      paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
      receiptId: receipt.id,
      receiptNumber: receipt.receiptNumber,
    };
  });
}

export async function listPayments(params: {
  businessId: string;
  outletId: string;
  page: number;
  perPage: number;
  orderId?: string;
  search?: string;
}) {
  const keyword = params.search?.trim() || params.orderId?.trim() || '';

  const where: Prisma.PaymentWhereInput = {
    businessId: params.businessId,
    outletId: params.outletId,
    ...(keyword
      ? {
          OR: [
            {
              id: keyword,
            },
            {
              orderId: keyword,
            },
            {
              paymentNumber: {
                contains: keyword,
                mode: 'insensitive',
              },
            },
            {
              order: {
                orderNumber: {
                  contains: keyword,
                  mode: 'insensitive',
                },
              },
            },
          ],
        }
      : {}),
  };

  const skip = (params.page - 1) * params.perPage;

  const [total, rows] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
        receipt: {
          select: {
            id: true,
            receiptNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: params.perPage,
    }),
  ]);

  return {
    items: rows.map((payment) => ({
      id: payment.id,
      paymentNumber: payment.paymentNumber,
      orderId: payment.orderId,
      orderNumber: payment.order?.orderNumber ?? null,
      businessId: payment.businessId,
      outletId: payment.outletId,
      method: payment.method,
      status: payment.status,
      amountPaid: toMoneyString(payment.amountPaid),
      amountTendered: toMoneyString(payment.amountTendered),
      changeAmount: toMoneyString(payment.changeAmount),
      note: payment.note,
      paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
      receiptId: payment.receipt?.id ?? null,
      receiptNumber: payment.receipt?.receiptNumber ?? null,
      receipt: payment.receipt
        ? {
            id: payment.receipt.id,
            receiptNumber: payment.receipt.receiptNumber,
          }
        : null,
    })),
    meta: {
      page: params.page,
      perPage: params.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.perPage)),
    },
  };
}

export async function getPaymentById(params: {
  businessId: string;
  outletId: string;
  paymentId: string;
}) {
  const payment = await prisma.payment.findFirst({
    where: {
      id: params.paymentId,
      businessId: params.businessId,
      outletId: params.outletId,
    },
    include: {
      order: {
        select: {
          orderNumber: true,
        },
      },
      receipt: {
        select: {
          id: true,
          receiptNumber: true,
        },
      },
    },
  });

  if (!payment) {
    throw new Error('Payment tidak ditemukan');
  }

  return {
    id: payment.id,
    paymentNumber: payment.paymentNumber,
    orderId: payment.orderId,
    orderNumber: payment.order?.orderNumber ?? null,
    businessId: payment.businessId,
    outletId: payment.outletId,
    method: payment.method,
    status: payment.status,
    amountPaid: toMoneyString(payment.amountPaid),
    amountTendered: toMoneyString(payment.amountTendered),
    changeAmount: toMoneyString(payment.changeAmount),
    note: payment.note,
    paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
    receiptId: payment.receipt?.id ?? null,
    receiptNumber: payment.receipt?.receiptNumber ?? null,
    receipt: payment.receipt
      ? {
          id: payment.receipt.id,
          receiptNumber: payment.receipt.receiptNumber,
        }
      : null,
  };
}
