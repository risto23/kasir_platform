import {
  GoodsReceiptStatus,
  PaymentMethod,
  Prisma,
  PurchaseOrderStatus,
  SupplierInvoiceStatus,
  SupplierStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import type {
  CreateSupplierInvoiceInput,
  CreateSupplierPaymentInput,
  ListSupplierInvoicesInput,
  SupplierInvoiceDetailDto,
  SupplierInvoiceSummaryDto,
  SupplierPaymentDto,
  UpdateSupplierInvoiceInput,
  VoidSupplierInvoiceInput,
} from './supplier-invoices.types';

function createHttpError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function toMoneyString(
  value: Prisma.Decimal | number | string | null | undefined,
): string {
  if (value === null || value === undefined) {
    return '0.00';
  }

  if (value instanceof Prisma.Decimal) {
    return value.toFixed(2);
  }

  return Number(value).toFixed(2);
}

function normalizeSearch(search?: string) {
  const trimmed = search?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function normalizeRequiredText(value: string) {
  return value.trim();
}

function normalizeNullableText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function ensureOutletBelongsToBusiness(
  tx: Prisma.TransactionClient,
  businessId: string,
  outletId: string,
) {
  const outlet = await tx.outlet.findFirst({
    where: {
      id: outletId,
      businessId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!outlet) {
    throw createHttpError('Outlet tidak ditemukan pada business aktif.', 404);
  }

  return outlet;
}

async function ensureBusinessUserBelongsToBusiness(
  tx: Prisma.TransactionClient,
  businessId: string,
  businessUserId: string,
) {
  const businessUser = await tx.businessUser.findFirst({
    where: {
      id: businessUserId,
      businessId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
    },
  });

  if (!businessUser) {
    throw createHttpError('Business user tidak ditemukan pada business aktif.', 404);
  }

  return businessUser;
}

async function ensureSupplierBelongsToBusiness(
  tx: Prisma.TransactionClient,
  businessId: string,
  supplierId: string,
) {
  const supplier = await tx.supplier.findFirst({
    where: {
      id: supplierId,
      businessId,
    },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      paymentTermDays: true,
    },
  });

  if (!supplier) {
    throw createHttpError('Supplier tidak ditemukan pada business aktif.', 404);
  }

  if (supplier.status !== SupplierStatus.ACTIVE) {
    throw createHttpError('Supplier tidak aktif.', 400);
  }

  return supplier;
}

async function ensureInvoiceNumberUnique(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    invoiceNumber: string;
    excludeId?: string;
  },
) {
  const existing = await tx.supplierInvoice.findFirst({
    where: {
      businessId: params.businessId,
      ...(params.excludeId
        ? {
            id: {
              not: params.excludeId,
            },
          }
        : {}),
      invoiceNumber: {
        equals: params.invoiceNumber,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw createHttpError('Nomor invoice supplier sudah digunakan.', 409);
  }
}

async function ensureGoodsReceiptInvoiceUnique(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    goodsReceiptId?: string;
    excludeId?: string;
  },
) {
  if (!params.goodsReceiptId) {
    return;
  }

  const existing = await tx.supplierInvoice.findFirst({
    where: {
      businessId: params.businessId,
      goodsReceiptId: params.goodsReceiptId,
      ...(params.excludeId
        ? {
            id: {
              not: params.excludeId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw createHttpError(
      'Goods receipt ini sudah memiliki supplier invoice.',
      409,
    );
  }
}

async function generateAutoSupplierInvoiceNumber(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    goodsReceiptNumber: string;
    supplierInvoiceNumber?: string | null;
  },
) {
  const candidateNumbers: string[] = [];
  const preferredSupplierInvoiceNumber = normalizeNullableText(
    params.supplierInvoiceNumber,
  );

  if (preferredSupplierInvoiceNumber) {
    candidateNumbers.push(preferredSupplierInvoiceNumber);
  }

  candidateNumbers.push(`AUTO-${params.goodsReceiptNumber}`);

  for (const candidate of candidateNumbers) {
    const existing = await tx.supplierInvoice.findFirst({
      where: {
        businessId: params.businessId,
        invoiceNumber: {
          equals: candidate,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }
  }

  for (let index = 1; index <= 9999; index += 1) {
    const candidate = `AUTO-${params.goodsReceiptNumber}-${`${index}`.padStart(3, '0')}`;
    const existing = await tx.supplierInvoice.findFirst({
      where: {
        businessId: params.businessId,
        invoiceNumber: {
          equals: candidate,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw createHttpError('Gagal generate nomor invoice supplier otomatis.', 500);
}

async function ensurePurchaseOrderBelongsToBusiness(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    outletId: string;
    supplierId: string;
    purchaseOrderId: string;
  },
) {
  const purchaseOrder = await tx.purchaseOrder.findFirst({
    where: {
      id: params.purchaseOrderId,
      businessId: params.businessId,
      outletId: params.outletId,
      supplierId: params.supplierId,
    },
    select: {
      id: true,
      poNumber: true,
      status: true,
    },
  });

  if (!purchaseOrder) {
    throw createHttpError(
      'Purchase order tidak ditemukan atau tidak sesuai dengan supplier/outlet.',
      404,
    );
  }

  if (purchaseOrder.status === PurchaseOrderStatus.CANCELLED) {
    throw createHttpError('Purchase order yang dibatalkan tidak bisa dipakai.', 400);
  }

  return purchaseOrder;
}

async function ensureGoodsReceiptBelongsToBusiness(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    outletId: string;
    supplierId: string;
    goodsReceiptId: string;
  },
) {
  const goodsReceipt = await tx.goodsReceipt.findFirst({
    where: {
      id: params.goodsReceiptId,
      businessId: params.businessId,
      outletId: params.outletId,
      supplierId: params.supplierId,
    },
    select: {
      id: true,
      receiptNumber: true,
      purchaseOrderId: true,
      status: true,
      totalAmount: true,
    },
  });

  if (!goodsReceipt) {
    throw createHttpError(
      'Goods receipt tidak ditemukan atau tidak sesuai dengan supplier/outlet.',
      404,
    );
  }

  if (goodsReceipt.status !== GoodsReceiptStatus.POSTED) {
    throw createHttpError('Hanya goods receipt yang sudah diposting yang bisa ditagihkan.', 400);
  }

  return goodsReceipt;
}

function resolveDueDate(
  invoiceDate: Date,
  dueDate: Date | undefined,
  paymentTermDays: number | null,
) {
  if (dueDate) {
    return dueDate;
  }

  if (paymentTermDays && paymentTermDays > 0) {
    return addDays(invoiceDate, paymentTermDays);
  }

  return null;
}

async function resolveInvoiceReferences(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    outletId: string;
    supplierId: string;
    goodsReceiptId?: string;
    purchaseOrderId?: string;
    grandTotal?: number;
  },
) {
  const goodsReceipt = params.goodsReceiptId
    ? await ensureGoodsReceiptBelongsToBusiness(tx, {
        businessId: params.businessId,
        outletId: params.outletId,
        supplierId: params.supplierId,
        goodsReceiptId: params.goodsReceiptId,
      })
    : null;

  const purchaseOrderId = params.purchaseOrderId || goodsReceipt?.purchaseOrderId || null;

  const purchaseOrder = purchaseOrderId
    ? await ensurePurchaseOrderBelongsToBusiness(tx, {
        businessId: params.businessId,
        outletId: params.outletId,
        supplierId: params.supplierId,
        purchaseOrderId,
      })
    : null;

  if (
    goodsReceipt?.purchaseOrderId &&
    params.purchaseOrderId &&
    goodsReceipt.purchaseOrderId !== params.purchaseOrderId
  ) {
    throw createHttpError(
      'Purchase order pada invoice tidak cocok dengan purchase order goods receipt.',
      400,
    );
  }

  const grandTotal = goodsReceipt
    ? goodsReceipt.totalAmount
    : params.grandTotal !== undefined
      ? new Prisma.Decimal(params.grandTotal)
      : null;

  if (!grandTotal || grandTotal.lessThanOrEqualTo(new Prisma.Decimal(0))) {
    throw createHttpError(
      'Grand total wajib diisi untuk invoice manual atau harus tersedia dari goods receipt.',
      400,
    );
  }

  return {
    goodsReceipt,
    purchaseOrder,
    grandTotal,
  };
}

async function ensureSupplierInvoiceExists(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    outletId: string;
    supplierInvoiceId: string;
  },
) {
  const invoice = await tx.supplierInvoice.findFirst({
    where: {
      id: params.supplierInvoiceId,
      businessId: params.businessId,
      outletId: params.outletId,
    },
    select: {
      id: true,
      supplierId: true,
      goodsReceiptId: true,
      purchaseOrderId: true,
      status: true,
      paidAmount: true,
      outstandingAmount: true,
      _count: {
        select: {
          payments: true,
        },
      },
    },
  });

  if (!invoice) {
    throw createHttpError('Supplier invoice tidak ditemukan.', 404);
  }

  return invoice;
}

function validateSupplierInvoiceEditable(invoice: {
  status: SupplierInvoiceStatus;
  _count: {
    payments: number;
  };
}) {
  if (invoice.status !== SupplierInvoiceStatus.UNPAID) {
    throw createHttpError('Hanya invoice supplier UNPAID yang bisa diubah.', 400);
  }

  if (invoice._count.payments > 0) {
    throw createHttpError('Invoice supplier yang sudah punya pembayaran tidak bisa diubah.', 400);
  }
}

function mapSupplierPayment(payment: {
  id: string;
  supplierInvoiceId: string;
  paymentNumber: string;
  businessId: string;
  outletId: string;
  supplierId: string;
  method: PaymentMethod;
  amount: Prisma.Decimal;
  paymentDate: Date;
  referenceNumber: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SupplierPaymentDto {
  return {
    id: payment.id,
    supplierInvoiceId: payment.supplierInvoiceId,
    paymentNumber: payment.paymentNumber,
    businessId: payment.businessId,
    outletId: payment.outletId,
    supplierId: payment.supplierId,
    method: payment.method,
    amount: toMoneyString(payment.amount),
    paymentDate: payment.paymentDate.toISOString(),
    referenceNumber: payment.referenceNumber,
    note: payment.note,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

function mapSupplierInvoiceSummary(invoice: {
  id: string;
  businessId: string;
  outletId: string;
  supplierId: string;
  goodsReceiptId: string | null;
  purchaseOrderId: string | null;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date | null;
  notes: string | null;
  status: SupplierInvoiceStatus;
  grandTotal: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  outstandingAmount: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
  supplier: {
    name: string;
    code: string;
  };
  goodsReceipt: {
    receiptNumber: string;
  } | null;
  purchaseOrder: {
    poNumber: string;
  } | null;
  _count: {
    payments: number;
  };
}): SupplierInvoiceSummaryDto {
  return {
    id: invoice.id,
    businessId: invoice.businessId,
    outletId: invoice.outletId,
    supplierId: invoice.supplierId,
    goodsReceiptId: invoice.goodsReceiptId,
    purchaseOrderId: invoice.purchaseOrderId,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate.toISOString(),
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
    notes: invoice.notes,
    status: invoice.status,
    grandTotal: toMoneyString(invoice.grandTotal),
    paidAmount: toMoneyString(invoice.paidAmount),
    outstandingAmount: toMoneyString(invoice.outstandingAmount),
    supplierName: invoice.supplier.name,
    supplierCode: invoice.supplier.code,
    goodsReceiptNumber: invoice.goodsReceipt?.receiptNumber ?? null,
    purchaseOrderNumber: invoice.purchaseOrder?.poNumber ?? null,
    paymentCount: invoice._count.payments,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}

type SupplierInvoiceReader = Prisma.TransactionClient | typeof prisma;

async function getSupplierInvoiceByIdInternal(
  db: SupplierInvoiceReader,
  params: {
    businessId: string;
    outletId: string;
    supplierInvoiceId: string;
  },
): Promise<SupplierInvoiceDetailDto> {
  const invoice = await db.supplierInvoice.findFirst({
    where: {
      id: params.supplierInvoiceId,
      businessId: params.businessId,
      outletId: params.outletId,
    },
    include: {
      outlet: {
        select: {
          name: true,
        },
      },
      supplier: {
        select: {
          name: true,
          code: true,
        },
      },
      goodsReceipt: {
        select: {
          receiptNumber: true,
        },
      },
      purchaseOrder: {
        select: {
          poNumber: true,
        },
      },
      payments: {
        orderBy: [
          {
            paymentDate: 'desc',
          },
          {
            createdAt: 'desc',
          },
        ],
      },
      _count: {
        select: {
          payments: true,
        },
      },
    },
  });

  if (!invoice) {
    throw createHttpError('Supplier invoice tidak ditemukan.', 404);
  }

  const summary = mapSupplierInvoiceSummary(invoice);

  return {
    ...summary,
    outletName: invoice.outlet.name,
    createdByBusinessUserId: invoice.createdByBusinessUserId,
    payments: invoice.payments.map(mapSupplierPayment),
  };
}

async function generateSupplierPaymentNumber(tx: Prisma.TransactionClient) {
  const now = new Date();
  const prefix = `SPAY-${now.getFullYear()}${`${now.getMonth() + 1}`.padStart(2, '0')}${`${now.getDate()}`.padStart(2, '0')}`;

  const latest = await tx.supplierPayment.findFirst({
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

export async function listSupplierInvoices(input: ListSupplierInvoicesInput) {
  const search = normalizeSearch(input.search);

  const where: Prisma.SupplierInvoiceWhereInput = {
    businessId: input.businessId,
    outletId: input.outletId,
    ...(input.status
      ? {
          status: input.status,
        }
      : {}),
    ...(input.supplierId
      ? {
          supplierId: input.supplierId,
        }
      : {}),
    ...(search
      ? {
          OR: [
            {
              invoiceNumber: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              notes: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              supplier: {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
            {
              supplier: {
                code: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
            {
              goodsReceipt: {
                receiptNumber: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
            {
              purchaseOrder: {
                poNumber: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          ],
        }
      : {}),
  };

  const skip = (input.page - 1) * input.perPage;

  const [total, rows] = await Promise.all([
    prisma.supplierInvoice.count({ where }),
    prisma.supplierInvoice.findMany({
      where,
      include: {
        supplier: {
          select: {
            name: true,
            code: true,
          },
        },
        goodsReceipt: {
          select: {
            receiptNumber: true,
          },
        },
        purchaseOrder: {
          select: {
            poNumber: true,
          },
        },
        _count: {
          select: {
            payments: true,
          },
        },
      },
      orderBy: [
        {
          invoiceDate: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
      skip,
      take: input.perPage,
    }),
  ]);

  return {
    items: rows.map(mapSupplierInvoiceSummary),
    meta: {
      page: input.page,
      perPage: input.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.perPage)),
    },
  };
}

export async function getSupplierInvoiceById(params: {
  businessId: string;
  outletId: string;
  supplierInvoiceId: string;
}) {
  return getSupplierInvoiceByIdInternal(prisma, params);
}

export async function createSupplierInvoice(input: CreateSupplierInvoiceInput) {
  return prisma.$transaction(async (tx) => {
    await ensureOutletBelongsToBusiness(tx, input.businessId, input.outletId);
    await ensureBusinessUserBelongsToBusiness(
      tx,
      input.businessId,
      input.businessUserId,
    );
    const supplier = await ensureSupplierBelongsToBusiness(
      tx,
      input.businessId,
      input.supplierId,
    );

    const invoiceNumber = normalizeRequiredText(input.invoiceNumber);
    await ensureInvoiceNumberUnique(tx, {
      businessId: input.businessId,
      invoiceNumber,
    });
    await ensureGoodsReceiptInvoiceUnique(tx, {
      businessId: input.businessId,
      goodsReceiptId: input.goodsReceiptId,
    });

    const references = await resolveInvoiceReferences(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      supplierId: input.supplierId,
      goodsReceiptId: input.goodsReceiptId,
      purchaseOrderId: input.purchaseOrderId,
      grandTotal: input.grandTotal,
    });

    const dueDate = resolveDueDate(
      input.invoiceDate,
      input.dueDate,
      supplier.paymentTermDays,
    );

    const invoice = await tx.supplierInvoice.create({
      data: {
        businessId: input.businessId,
        outletId: input.outletId,
        supplierId: input.supplierId,
        goodsReceiptId: references.goodsReceipt?.id ?? null,
        purchaseOrderId: references.purchaseOrder?.id ?? null,
        createdByBusinessUserId: input.businessUserId,
        invoiceNumber,
        invoiceDate: input.invoiceDate,
        dueDate,
        notes: normalizeNullableText(input.notes),
        status: SupplierInvoiceStatus.UNPAID,
        grandTotal: references.grandTotal,
        paidAmount: new Prisma.Decimal(0),
        outstandingAmount: references.grandTotal,
      },
      select: {
        id: true,
      },
    });

    return getSupplierInvoiceByIdInternal(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      supplierInvoiceId: invoice.id,
    });
  });
}

export async function updateSupplierInvoice(input: UpdateSupplierInvoiceInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await ensureSupplierInvoiceExists(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      supplierInvoiceId: input.supplierInvoiceId,
    });

    validateSupplierInvoiceEditable(existing);

    await ensureOutletBelongsToBusiness(tx, input.businessId, input.outletId);
    const supplier = await ensureSupplierBelongsToBusiness(
      tx,
      input.businessId,
      input.supplierId,
    );

    const invoiceNumber = normalizeRequiredText(input.invoiceNumber);
    await ensureInvoiceNumberUnique(tx, {
      businessId: input.businessId,
      invoiceNumber,
      excludeId: input.supplierInvoiceId,
    });
    await ensureGoodsReceiptInvoiceUnique(tx, {
      businessId: input.businessId,
      goodsReceiptId: input.goodsReceiptId,
      excludeId: input.supplierInvoiceId,
    });

    const references = await resolveInvoiceReferences(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      supplierId: input.supplierId,
      goodsReceiptId: input.goodsReceiptId,
      purchaseOrderId: input.purchaseOrderId,
      grandTotal: input.grandTotal,
    });

    const dueDate = resolveDueDate(
      input.invoiceDate,
      input.dueDate,
      supplier.paymentTermDays,
    );

    await tx.supplierInvoice.update({
      where: {
        id: input.supplierInvoiceId,
      },
      data: {
        supplierId: input.supplierId,
        goodsReceiptId: references.goodsReceipt?.id ?? null,
        purchaseOrderId: references.purchaseOrder?.id ?? null,
        invoiceNumber,
        invoiceDate: input.invoiceDate,
        dueDate,
        notes: normalizeNullableText(input.notes),
        grandTotal: references.grandTotal,
        outstandingAmount: references.grandTotal,
      },
    });

    return getSupplierInvoiceByIdInternal(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      supplierInvoiceId: input.supplierInvoiceId,
    });
  });
}

export async function voidSupplierInvoice(input: VoidSupplierInvoiceInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await ensureSupplierInvoiceExists(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      supplierInvoiceId: input.supplierInvoiceId,
    });

    validateSupplierInvoiceEditable(existing);

    await tx.supplierInvoice.update({
      where: {
        id: input.supplierInvoiceId,
      },
      data: {
        status: SupplierInvoiceStatus.VOID,
      },
    });

    return getSupplierInvoiceByIdInternal(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      supplierInvoiceId: input.supplierInvoiceId,
    });
  });
}

export async function createSupplierPayment(input: CreateSupplierPaymentInput) {
  return prisma.$transaction(async (tx) => {
    await ensureBusinessUserBelongsToBusiness(
      tx,
      input.businessId,
      input.businessUserId,
    );

    const invoice = await tx.supplierInvoice.findFirst({
      where: {
        id: input.supplierInvoiceId,
        businessId: input.businessId,
        outletId: input.outletId,
      },
      select: {
        id: true,
        businessId: true,
        outletId: true,
        supplierId: true,
        status: true,
        outstandingAmount: true,
      },
    });

    if (!invoice) {
      throw createHttpError('Supplier invoice tidak ditemukan.', 404);
    }

    if (invoice.status === SupplierInvoiceStatus.VOID) {
      throw createHttpError('Invoice supplier yang void tidak bisa dibayar.', 400);
    }

    if (invoice.status === SupplierInvoiceStatus.PAID) {
      throw createHttpError('Invoice supplier ini sudah lunas.', 400);
    }

    const amount = new Prisma.Decimal(input.amount);

    if (amount.greaterThan(invoice.outstandingAmount)) {
      throw createHttpError('Jumlah pembayaran melebihi outstanding invoice.', 400);
    }

    const paymentNumber = await generateSupplierPaymentNumber(tx);

    const payment = await tx.supplierPayment.create({
      data: {
        supplierInvoiceId: invoice.id,
        businessId: invoice.businessId,
        outletId: invoice.outletId,
        supplierId: invoice.supplierId,
        paidByBusinessUserId: input.businessUserId,
        paymentNumber,
        method: input.method,
        amount,
        paymentDate: input.paymentDate,
        referenceNumber: normalizeNullableText(input.referenceNumber),
        note: normalizeNullableText(input.note),
      },
    });

    const nextOutstanding = invoice.outstandingAmount.minus(amount);
    const nextPaid = amount.plus(
      await tx.supplierPayment.aggregate({
        where: {
          supplierInvoiceId: invoice.id,
          id: {
            not: payment.id,
          },
        },
        _sum: {
          amount: true,
        },
      }).then((result) => result._sum.amount ?? new Prisma.Decimal(0)),
    );

    await tx.supplierInvoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        paidAmount: nextPaid,
        outstandingAmount: nextOutstanding,
        status: nextOutstanding.lessThanOrEqualTo(new Prisma.Decimal(0))
          ? SupplierInvoiceStatus.PAID
          : SupplierInvoiceStatus.PARTIALLY_PAID,
      },
    });

    return {
      payment: mapSupplierPayment(payment),
      invoice: await getSupplierInvoiceByIdInternal(tx, {
        businessId: input.businessId,
        outletId: input.outletId,
        supplierInvoiceId: invoice.id,
      }),
    };
  });
}

export async function ensureAutoSupplierInvoiceForPostedGoodsReceiptTx(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    outletId: string;
    goodsReceiptId: string;
    businessUserId: string;
  },
) {
  const existing = await tx.supplierInvoice.findFirst({
    where: {
      businessId: params.businessId,
      outletId: params.outletId,
      goodsReceiptId: params.goodsReceiptId,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return existing;
  }

  const goodsReceipt = await tx.goodsReceipt.findFirst({
    where: {
      id: params.goodsReceiptId,
      businessId: params.businessId,
      outletId: params.outletId,
    },
    select: {
      id: true,
      supplierId: true,
      purchaseOrderId: true,
      receiptNumber: true,
      receiptDate: true,
      supplierInvoiceNumber: true,
      totalAmount: true,
      status: true,
      supplier: {
        select: {
          paymentTermDays: true,
        },
      },
    },
  });

  if (!goodsReceipt) {
    throw createHttpError('Goods receipt tidak ditemukan.', 404);
  }

  if (goodsReceipt.status !== GoodsReceiptStatus.POSTED) {
    throw createHttpError(
      'Supplier invoice otomatis hanya bisa dibuat dari goods receipt yang sudah diposting.',
      400,
    );
  }

  await ensureGoodsReceiptInvoiceUnique(tx, {
    businessId: params.businessId,
    goodsReceiptId: goodsReceipt.id,
  });

  const invoiceNumber = await generateAutoSupplierInvoiceNumber(tx, {
    businessId: params.businessId,
    goodsReceiptNumber: goodsReceipt.receiptNumber,
    supplierInvoiceNumber: goodsReceipt.supplierInvoiceNumber,
  });

  const dueDate = resolveDueDate(
    goodsReceipt.receiptDate,
    undefined,
    goodsReceipt.supplier.paymentTermDays,
  );

  return tx.supplierInvoice.create({
    data: {
      businessId: params.businessId,
      outletId: params.outletId,
      supplierId: goodsReceipt.supplierId,
      goodsReceiptId: goodsReceipt.id,
      purchaseOrderId: goodsReceipt.purchaseOrderId,
      createdByBusinessUserId: params.businessUserId,
      invoiceNumber,
      invoiceDate: goodsReceipt.receiptDate,
      dueDate,
      notes: `Auto-created from goods receipt ${goodsReceipt.receiptNumber}`,
      status: SupplierInvoiceStatus.UNPAID,
      grandTotal: goodsReceipt.totalAmount,
      paidAmount: new Prisma.Decimal(0),
      outstandingAmount: goodsReceipt.totalAmount,
    },
    select: {
      id: true,
    },
  });
}
