import {
  Prisma,
  SupplierCreditSource,
  SupplierCreditStatus,
  SupplierCreditUsageType,
  SupplierInvoiceStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import type {
  ApplySupplierCreditInput,
  IssueSupplierCreditForOverpaymentParams,
  ListSupplierCreditsInput,
  RefundSupplierCreditInput,
  SupplierCreditDetailDto,
  SupplierCreditSummaryDto,
  SupplierCreditUsageDto,
} from './supplier-credits.types';

const ZERO = new Prisma.Decimal(0);

type SupplierCreditReader = Prisma.TransactionClient | typeof prisma;

function createHttpError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function toMoneyString(value: Prisma.Decimal | null | undefined): string {
  if (value === null || value === undefined) {
    return '0.00';
  }

  return value.toFixed(2);
}

function normalizeNullableText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function buildDatePrefix(prefix: string) {
  const now = new Date();
  return `${prefix}-${now.getFullYear()}${`${now.getMonth() + 1}`.padStart(2, '0')}${`${now.getDate()}`.padStart(2, '0')}`;
}

function nextSequenceNumber(prefix: string, latest: string | null | undefined) {
  const latestSequence = latest ? Number(latest.split('-').pop() ?? '0') : 0;
  return `${prefix}-${`${latestSequence + 1}`.padStart(4, '0')}`;
}

async function generateSupplierCreditNumber(tx: Prisma.TransactionClient) {
  const prefix = buildDatePrefix('SCR');
  const latest = await tx.supplierCredit.findFirst({
    where: { creditNumber: { startsWith: prefix } },
    orderBy: { creditNumber: 'desc' },
    select: { creditNumber: true },
  });

  return nextSequenceNumber(prefix, latest?.creditNumber);
}

async function generateSupplierCreditUsageNumber(tx: Prisma.TransactionClient) {
  const prefix = buildDatePrefix('SCU');
  const latest = await tx.supplierCreditUsage.findFirst({
    where: { usageNumber: { startsWith: prefix } },
    orderBy: { usageNumber: 'desc' },
    select: { usageNumber: true },
  });

  return nextSequenceNumber(prefix, latest?.usageNumber);
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
    select: { id: true },
  });

  if (!businessUser) {
    throw createHttpError('Business user tidak ditemukan pada business aktif.', 404);
  }
}

const supplierCreditInclude = {
  supplier: {
    select: { name: true, code: true },
  },
  sourceSupplierInvoice: {
    select: { invoiceNumber: true },
  },
  purchaseReturn: {
    select: { returnNumber: true },
  },
} satisfies Prisma.SupplierCreditInclude;

type SupplierCreditRow = Prisma.SupplierCreditGetPayload<{
  include: typeof supplierCreditInclude;
}>;

const supplierCreditUsageInclude = {
  supplierCredit: {
    select: { creditNumber: true },
  },
  supplierInvoice: {
    select: { invoiceNumber: true },
  },
} satisfies Prisma.SupplierCreditUsageInclude;

type SupplierCreditUsageRow = Prisma.SupplierCreditUsageGetPayload<{
  include: typeof supplierCreditUsageInclude;
}>;

function mapSupplierCreditSummary(row: SupplierCreditRow): SupplierCreditSummaryDto {
  return {
    id: row.id,
    businessId: row.businessId,
    outletId: row.outletId,
    supplierId: row.supplierId,
    supplierName: row.supplier.name,
    supplierCode: row.supplier.code,
    creditNumber: row.creditNumber,
    sourceType: row.sourceType,
    status: row.status,
    sourceSupplierInvoiceId: row.sourceSupplierInvoiceId,
    sourceSupplierInvoiceNumber: row.sourceSupplierInvoice?.invoiceNumber ?? null,
    purchaseReturnId: row.purchaseReturnId,
    purchaseReturnNumber: row.purchaseReturn?.returnNumber ?? null,
    amount: toMoneyString(row.amount),
    usedAmount: toMoneyString(row.usedAmount),
    remainingAmount: toMoneyString(row.remainingAmount),
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapSupplierCreditUsage(row: SupplierCreditUsageRow): SupplierCreditUsageDto {
  return {
    id: row.id,
    supplierCreditId: row.supplierCreditId,
    creditNumber: row.supplierCredit.creditNumber,
    usageNumber: row.usageNumber,
    type: row.type,
    supplierInvoiceId: row.supplierInvoiceId,
    supplierInvoiceNumber: row.supplierInvoice?.invoiceNumber ?? null,
    method: row.method,
    amount: toMoneyString(row.amount),
    usageDate: row.usageDate.toISOString(),
    referenceNumber: row.referenceNumber,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Credits issued from and applied to one supplier invoice, for the invoice
 * detail response.
 */
export async function getSupplierCreditsForInvoice(
  db: SupplierCreditReader,
  supplierInvoiceId: string,
): Promise<{
  issuedCredits: SupplierCreditSummaryDto[];
  appliedCredits: SupplierCreditUsageDto[];
}> {
  const [issued, applied] = await Promise.all([
    db.supplierCredit.findMany({
      where: { sourceSupplierInvoiceId: supplierInvoiceId },
      include: supplierCreditInclude,
      orderBy: { createdAt: 'desc' },
    }),
    db.supplierCreditUsage.findMany({
      where: {
        supplierInvoiceId,
        type: SupplierCreditUsageType.APPLY_TO_INVOICE,
      },
      include: supplierCreditUsageInclude,
      orderBy: [{ usageDate: 'desc' }, { createdAt: 'desc' }],
    }),
  ]);

  return {
    issuedCredits: issued.map(mapSupplierCreditSummary),
    appliedCredits: applied.map(mapSupplierCreditUsage),
  };
}

/**
 * Record money already paid to the supplier above the invoice total (e.g. a
 * purchase return posted after the invoice was paid) as supplier credit.
 * Returns null when there is nothing to credit.
 */
export async function issueSupplierCreditForOverpaymentTx(
  tx: Prisma.TransactionClient,
  params: IssueSupplierCreditForOverpaymentParams,
) {
  const amount = new Prisma.Decimal(params.amount);

  if (amount.lessThanOrEqualTo(ZERO)) {
    return null;
  }

  const creditNumber = await generateSupplierCreditNumber(tx);

  return tx.supplierCredit.create({
    data: {
      businessId: params.businessId,
      outletId: params.outletId,
      supplierId: params.supplierId,
      sourceSupplierInvoiceId: params.sourceSupplierInvoiceId,
      purchaseReturnId: params.purchaseReturnId,
      createdByBusinessUserId: params.createdByBusinessUserId,
      creditNumber,
      sourceType: SupplierCreditSource.PURCHASE_RETURN_OVERPAYMENT,
      status: SupplierCreditStatus.OPEN,
      amount,
      usedAmount: ZERO,
      remainingAmount: amount,
      notes: params.notes,
    },
    select: {
      id: true,
      creditNumber: true,
      amount: true,
    },
  });
}

async function getSupplierCreditByIdInternal(
  db: SupplierCreditReader,
  params: {
    businessId: string;
    outletId: string;
    supplierCreditId: string;
  },
): Promise<SupplierCreditDetailDto> {
  const credit = await db.supplierCredit.findFirst({
    where: {
      id: params.supplierCreditId,
      businessId: params.businessId,
      outletId: params.outletId,
    },
    include: {
      ...supplierCreditInclude,
      usages: {
        include: supplierCreditUsageInclude,
        orderBy: [{ usageDate: 'desc' }, { createdAt: 'desc' }],
      },
    },
  });

  if (!credit) {
    throw createHttpError('Kredit supplier tidak ditemukan.', 404);
  }

  return {
    ...mapSupplierCreditSummary(credit),
    usages: credit.usages.map(mapSupplierCreditUsage),
  };
}

async function findOpenSupplierCreditOrThrow(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    outletId: string;
    supplierCreditId: string;
  },
) {
  const credit = await tx.supplierCredit.findFirst({
    where: {
      id: params.supplierCreditId,
      businessId: params.businessId,
      outletId: params.outletId,
    },
    select: {
      id: true,
      businessId: true,
      outletId: true,
      supplierId: true,
      status: true,
      remainingAmount: true,
    },
  });

  if (!credit) {
    throw createHttpError('Kredit supplier tidak ditemukan.', 404);
  }

  if (credit.status !== SupplierCreditStatus.OPEN || credit.remainingAmount.lessThanOrEqualTo(ZERO)) {
    throw createHttpError('Kredit supplier ini sudah habis dipakai.', 400);
  }

  return credit;
}

/**
 * Reduce the credit balance atomically; fails when another request used the
 * balance first.
 */
async function consumeSupplierCreditTx(
  tx: Prisma.TransactionClient,
  supplierCreditId: string,
  amount: Prisma.Decimal,
) {
  const updated = await tx.supplierCredit.updateMany({
    where: {
      id: supplierCreditId,
      status: SupplierCreditStatus.OPEN,
      remainingAmount: { gte: amount },
    },
    data: {
      usedAmount: { increment: amount },
      remainingAmount: { decrement: amount },
    },
  });

  if (updated.count !== 1) {
    throw createHttpError('Jumlah melebihi sisa kredit supplier.', 400);
  }

  const credit = await tx.supplierCredit.findUniqueOrThrow({
    where: { id: supplierCreditId },
    select: { remainingAmount: true },
  });

  if (credit.remainingAmount.lessThanOrEqualTo(ZERO)) {
    await tx.supplierCredit.update({
      where: { id: supplierCreditId },
      data: { status: SupplierCreditStatus.CLOSED },
    });
  }
}

export async function listSupplierCredits(input: ListSupplierCreditsInput) {
  const where: Prisma.SupplierCreditWhereInput = {
    businessId: input.businessId,
    outletId: input.outletId,
    ...(input.supplierId ? { supplierId: input.supplierId } : {}),
    ...(input.status ? { status: input.status } : {}),
  };

  const skip = (input.page - 1) * input.perPage;

  const [total, rows, openAggregate] = await Promise.all([
    prisma.supplierCredit.count({ where }),
    prisma.supplierCredit.findMany({
      where,
      include: supplierCreditInclude,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: input.perPage,
    }),
    prisma.supplierCredit.aggregate({
      where: { ...where, status: SupplierCreditStatus.OPEN },
      _sum: { remainingAmount: true },
    }),
  ]);

  return {
    items: rows.map(mapSupplierCreditSummary),
    meta: {
      page: input.page,
      perPage: input.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.perPage)),
      totalOpenRemainingAmount: toMoneyString(openAggregate._sum.remainingAmount ?? ZERO),
    },
  };
}

export async function getSupplierCreditById(params: {
  businessId: string;
  outletId: string;
  supplierCreditId: string;
}) {
  return getSupplierCreditByIdInternal(prisma, params);
}

export async function refundSupplierCredit(input: RefundSupplierCreditInput) {
  return prisma.$transaction(async (tx) => {
    await ensureBusinessUserBelongsToBusiness(tx, input.businessId, input.businessUserId);

    const credit = await findOpenSupplierCreditOrThrow(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      supplierCreditId: input.supplierCreditId,
    });

    const amount = new Prisma.Decimal(input.amount);

    if (amount.greaterThan(credit.remainingAmount)) {
      throw createHttpError('Jumlah refund melebihi sisa kredit supplier.', 400);
    }

    await consumeSupplierCreditTx(tx, credit.id, amount);

    const usageNumber = await generateSupplierCreditUsageNumber(tx);

    await tx.supplierCreditUsage.create({
      data: {
        supplierCreditId: credit.id,
        businessId: credit.businessId,
        outletId: credit.outletId,
        supplierId: credit.supplierId,
        supplierInvoiceId: null,
        createdByBusinessUserId: input.businessUserId,
        usageNumber,
        type: SupplierCreditUsageType.REFUND,
        method: input.method,
        amount,
        usageDate: input.refundDate,
        referenceNumber: normalizeNullableText(input.referenceNumber),
        note: normalizeNullableText(input.note),
      },
    });

    return getSupplierCreditByIdInternal(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      supplierCreditId: credit.id,
    });
  });
}

export async function applySupplierCreditToInvoice(input: ApplySupplierCreditInput) {
  return prisma.$transaction(async (tx) => {
    await ensureBusinessUserBelongsToBusiness(tx, input.businessId, input.businessUserId);

    const credit = await findOpenSupplierCreditOrThrow(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      supplierCreditId: input.supplierCreditId,
    });

    const invoice = await tx.supplierInvoice.findFirst({
      where: {
        id: input.supplierInvoiceId,
        businessId: input.businessId,
        outletId: input.outletId,
      },
      select: {
        id: true,
        supplierId: true,
        status: true,
        outstandingAmount: true,
      },
    });

    if (!invoice) {
      throw createHttpError('Supplier invoice tidak ditemukan.', 404);
    }

    if (invoice.supplierId !== credit.supplierId) {
      throw createHttpError('Kredit hanya bisa dipakai untuk invoice supplier yang sama.', 400);
    }

    if (invoice.status === SupplierInvoiceStatus.VOID) {
      throw createHttpError('Invoice supplier yang void tidak bisa dibayar.', 400);
    }

    if (invoice.status === SupplierInvoiceStatus.PAID) {
      throw createHttpError('Invoice supplier ini sudah lunas.', 400);
    }

    const amount = new Prisma.Decimal(input.amount);

    if (amount.greaterThan(credit.remainingAmount)) {
      throw createHttpError('Jumlah melebihi sisa kredit supplier.', 400);
    }

    if (amount.greaterThan(invoice.outstandingAmount)) {
      throw createHttpError('Jumlah pembayaran melebihi outstanding invoice.', 400);
    }

    await consumeSupplierCreditTx(tx, credit.id, amount);

    // Credit counts as paid on the target invoice (paidAmount = payments +
    // applied credit), so outstanding and status follow the normal rules.
    const invoiceUpdated = await tx.supplierInvoice.updateMany({
      where: {
        id: invoice.id,
        outstandingAmount: { gte: amount },
      },
      data: {
        paidAmount: { increment: amount },
        outstandingAmount: { decrement: amount },
      },
    });

    if (invoiceUpdated.count !== 1) {
      throw createHttpError('Jumlah pembayaran melebihi outstanding invoice.', 400);
    }

    const updatedInvoice = await tx.supplierInvoice.findUniqueOrThrow({
      where: { id: invoice.id },
      select: { outstandingAmount: true },
    });

    await tx.supplierInvoice.update({
      where: { id: invoice.id },
      data: {
        status: updatedInvoice.outstandingAmount.lessThanOrEqualTo(ZERO)
          ? SupplierInvoiceStatus.PAID
          : SupplierInvoiceStatus.PARTIALLY_PAID,
      },
    });

    const usageNumber = await generateSupplierCreditUsageNumber(tx);

    await tx.supplierCreditUsage.create({
      data: {
        supplierCreditId: credit.id,
        businessId: credit.businessId,
        outletId: credit.outletId,
        supplierId: credit.supplierId,
        supplierInvoiceId: invoice.id,
        createdByBusinessUserId: input.businessUserId,
        usageNumber,
        type: SupplierCreditUsageType.APPLY_TO_INVOICE,
        method: null,
        amount,
        usageDate: input.usageDate ?? new Date(),
        referenceNumber: null,
        note: normalizeNullableText(input.note),
      },
    });

    return getSupplierCreditByIdInternal(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      supplierCreditId: credit.id,
    });
  });
}
