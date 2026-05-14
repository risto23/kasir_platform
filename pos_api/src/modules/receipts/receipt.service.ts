import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

function toMoneyString(value: Prisma.Decimal | number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return '0';
  }

  if (value instanceof Prisma.Decimal) {
    return value.toFixed(2);
  }

  return Number(value).toFixed(2);
}

export async function createReceiptForPaidOrder(params: {
  tx: Prisma.TransactionClient;
  orderId: string;
  paymentId: string;
  businessId: string;
  outletId: string;
}) {
  const existingReceipt = await params.tx.receipt.findUnique({
    where: {
      orderId: params.orderId,
    },
  });

  if (existingReceipt) {
    return existingReceipt;
  }

  const order = await params.tx.order.findFirst({
    where: {
      id: params.orderId,
      businessId: params.businessId,
      outletId: params.outletId,
    },
    include: {
      business: {
        select: {
          name: true,
        },
      },
      outlet: {
        select: {
          name: true,
          address: true,
          phone: true,
          receiptSetting: {
            select: {
              brandName: true,
              logoUrl: true,
              headerText: true,
              footerText: true,
              showBusinessName: true,
              showOutletName: true,
              showOutletAddress: true,
              showOutletPhone: true,
            },
          },
        },
      },
      table: {
        select: {
          name: true,
        },
      },
      items: {
        orderBy: {
          createdAt: 'asc',
        },
      },
      payments: {
        orderBy: {
          createdAt: 'asc',
        },
        take: 1,
        include: {
          receivedByBusinessUser: {
            select: {
              user: {
                select: {
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error('Order untuk struk tidak ditemukan');
  }

  const now = new Date();
  const prefix = `RCT-${now.getFullYear()}${`${now.getMonth() + 1}`.padStart(2, '0')}${`${now.getDate()}`.padStart(2, '0')}`;
  const latestReceipt = await params.tx.receipt.findFirst({
    where: {
      receiptNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      receiptNumber: 'desc',
    },
    select: {
      receiptNumber: true,
    },
  });

  const latestSequence = latestReceipt?.receiptNumber
    ? Number(latestReceipt.receiptNumber.split('-').pop() ?? '0')
    : 0;

  const receiptNumber = `${prefix}-${`${latestSequence + 1}`.padStart(4, '0')}`;

  return params.tx.receipt.create({
    data: {
      orderId: order.id,
      paymentId: params.paymentId,
      businessId: order.businessId,
      outletId: order.outletId,
      receiptNumber,
      businessName: order.business.name,
      outletName: order.outlet.name,
      outletAddress: order.outlet.address,
      issuedAt: now,
      contentSnapshot: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        businessName: order.business.name,
        outletName: order.outlet.name,
        outletAddress: order.outlet.address,
        outletPhone: order.outlet.phone,
        brandName: order.outlet.receiptSetting?.brandName ?? order.outlet.name,
        logoUrl: order.outlet.receiptSetting?.logoUrl ?? null,
        headerText: order.outlet.receiptSetting?.headerText ?? null,
        footerText:
          order.outlet.receiptSetting?.footerText ??
          'Terima kasih. Simpan struk ini sebagai bukti transaksi.',
        showBusinessName: order.outlet.receiptSetting?.showBusinessName ?? true,
        showOutletName: order.outlet.receiptSetting?.showOutletName ?? true,
        showOutletAddress: order.outlet.receiptSetting?.showOutletAddress ?? true,
        showOutletPhone: order.outlet.receiptSetting?.showOutletPhone ?? true,
        tableName: order.table?.name ?? null,
        customerName: order.customerName ?? null,
        cashierName: order.payments[0]?.receivedByBusinessUser?.user?.fullName ?? null,
        notes: order.notes,
        subtotal: toMoneyString(order.subtotal),
        discountAmount: toMoneyString(order.discountAmount),
        taxAmount: toMoneyString(order.taxAmount),
        serviceChargeAmount: toMoneyString(order.serviceChargeAmount),
        surchargeAmount: toMoneyString(order.payments[0]?.surchargeAmount ?? 0),
        totalAmount: toMoneyString(order.totalAmount),
        items: order.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          productCode: item.productCode,
          productSku: item.productSku,
          productBarcode: item.productBarcode,
          quantity: toMoneyString(item.quantity),
          unitPrice: toMoneyString(item.unitPrice),
          lineSubtotal: toMoneyString(item.lineSubtotal),
          lineDiscountAmount: toMoneyString(item.lineDiscountAmount),
          lineTotal: toMoneyString(item.lineTotal),
          note: item.note,
          status: item.status,
        })),
      },
    },
  });
}

export async function getReceiptById(params: {
  businessId: string;
  outletId: string;
  receiptId: string;
}) {
  const receipt = await prisma.receipt.findFirst({
    where: {
      id: params.receiptId,
      businessId: params.businessId,
      outletId: params.outletId,
    },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          subtotal: true,
          discountAmount: true,
          taxAmount: true,
          serviceChargeAmount: true,
          totalAmount: true,
        },
      },
      payment: {
        select: {
          id: true,
          paymentNumber: true,
          method: true,
          status: true,
          amountPaid: true,
          amountTendered: true,
          changeAmount: true,
          paidAt: true,
        },
      },
    },
  });

  if (!receipt) {
    throw new Error('Receipt tidak ditemukan');
  }

  return {
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    businessId: receipt.businessId,
    outletId: receipt.outletId,
    businessName: receipt.businessName,
    outletName: receipt.outletName,
    outletAddress: receipt.outletAddress,
    issuedAt: receipt.issuedAt.toISOString(),
    printedAt: receipt.printedAt ? receipt.printedAt.toISOString() : null,
    order: {
      id: receipt.order.id,
      orderNumber: receipt.order.orderNumber,
      status: receipt.order.status,
      paymentStatus: receipt.order.paymentStatus,
      subtotal: toMoneyString(receipt.order.subtotal),
      discountAmount: toMoneyString(receipt.order.discountAmount),
      taxAmount: toMoneyString(receipt.order.taxAmount),
      serviceChargeAmount: toMoneyString(receipt.order.serviceChargeAmount),
      totalAmount: toMoneyString(receipt.order.totalAmount),
    },
    payment: receipt.payment
      ? {
          id: receipt.payment.id,
          paymentNumber: receipt.payment.paymentNumber,
          method: receipt.payment.method,
          status: receipt.payment.status,
          amountPaid: toMoneyString(receipt.payment.amountPaid),
          amountTendered: toMoneyString(receipt.payment.amountTendered),
          changeAmount: toMoneyString(receipt.payment.changeAmount),
          paidAt: receipt.payment.paidAt ? receipt.payment.paidAt.toISOString() : null,
        }
      : null,
    contentSnapshot: receipt.contentSnapshot,
  };
}

export async function getReceiptByOrderId(params: {
  businessId: string;
  outletId: string;
  orderId: string;
}) {
  const receipt = await prisma.receipt.findFirst({
    where: {
      orderId: params.orderId,
      businessId: params.businessId,
      outletId: params.outletId,
    },
    select: {
      id: true,
    },
  });

  if (!receipt) {
    throw new Error('Receipt untuk order ini belum tersedia');
  }

  return getReceiptById({
    businessId: params.businessId,
    outletId: params.outletId,
    receiptId: receipt.id,
  });
}
