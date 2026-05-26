import {
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import { enforceMonthlyTransactionLimit } from '../../middlewares/subscription-limit.middleware';
import { createReceiptForPaidOrder } from '../receipts/receipt.service';
import {
  calculateSurcharge,
  getOutletPaymentMethodByCode,
  parseSurchargeRules,
} from '../outlet-payment-methods/outlet-payment-methods.service';

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
  method: string;
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
      throw Object.assign(new Error('Order tidak ditemukan'), { statusCode: 404 });
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw Object.assign(new Error('Order yang dibatalkan tidak bisa dibayar'), { statusCode: 400 });
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw Object.assign(new Error('Order ini sudah dibayar'), { statusCode: 400 });
    }

    // Calculate surcharge based on outlet payment method config
    const paymentMethodConfig = await getOutletPaymentMethodByCode({
      businessId: params.businessId,
      outletId: params.outletId,
      code: params.method,
    });
    const surchargeRules = parseSurchargeRules(paymentMethodConfig?.surchargeRules ?? []);
    const orderTotalNumber = Number(order.totalAmount.toFixed(2));
    const surchargeNumber = calculateSurcharge(orderTotalNumber, surchargeRules);
    const surchargeDecimal = new Prisma.Decimal(surchargeNumber);
    const totalWithSurcharge = order.totalAmount.plus(surchargeDecimal);

    const amountPaidDecimal = new Prisma.Decimal(params.amountPaid);

    if (amountPaidDecimal.lessThan(totalWithSurcharge)) {
      throw Object.assign(new Error('Jumlah pembayaran kurang dari total order'), { statusCode: 400 });
    }

    const amountTenderedDecimal =
      params.amountTendered !== undefined
        ? new Prisma.Decimal(params.amountTendered)
        : amountPaidDecimal;

    if (amountTenderedDecimal.lessThan(amountPaidDecimal)) {
      throw Object.assign(new Error('Amount tendered tidak boleh lebih kecil dari amount paid'), { statusCode: 400 });
    }

    await enforceMonthlyTransactionLimit({
      reader: tx,
      businessId: params.businessId,
      blockedAction: 'CREATE_FINAL_PAYMENT',
    });

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
        surchargeAmount: surchargeNumber > 0 ? surchargeDecimal : null,
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
      surchargeAmount: toMoneyString(payment.surchargeAmount),
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
  status?: string;
}) {
  const keyword = params.search?.trim() || params.orderId?.trim() || '';

  const where: Prisma.PaymentWhereInput = {
    businessId: params.businessId,
    outletId: params.outletId,
    deletedAt: null,
    ...(params.status ? { status: params.status as PaymentStatus } : {}),
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
      surchargeAmount: toMoneyString(payment.surchargeAmount),
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
    surchargeAmount: toMoneyString(payment.surchargeAmount),
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

export async function softDeletePayment(params: {
  businessId: string;
  outletId: string;
  paymentId: string;
}) {
  const payment = await prisma.payment.findFirst({
    where: {
      id: params.paymentId,
      businessId: params.businessId,
      outletId: params.outletId,
      deletedAt: null,
    },
    select: { id: true, receipt: { select: { id: true } } },
  });

  if (!payment) throw new Error('Payment tidak ditemukan atau sudah dihapus');

  const now = new Date();

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { deletedAt: now },
    }),
    ...(payment.receipt
      ? [
          prisma.receipt.update({
            where: { id: payment.receipt.id },
            data: { deletedAt: now },
          }),
        ]
      : []),
  ]);
}
