/**
 * One-off correction: apply POSTED purchase returns to supplier debt (hutang).
 *
 * Before the fix, posting a purchase return only reduced the linked supplier
 * invoice when it was still UNPAID without payments. Invoices that already had
 * payments (or returns drafted before the invoice existed) kept the full debt.
 *
 * For every non-VOID supplier invoice linked to a goods receipt this script
 * recalculates:
 *   grandTotal        = goodsReceipt.totalAmount - SUM(POSTED returns of that GR)
 *   outstandingAmount = max(grandTotal - paidAmount, 0)
 *   status            = UNPAID | PARTIALLY_PAID | PAID | VOID (same rules as
 *                       postPurchaseReturn)
 * and links POSTED returns of that GR that have no supplierInvoiceId yet.
 *
 * The recalculation is idempotent: invoices already correct are skipped, so it
 * is safe to run more than once. paidAmount is never changed; a mismatch with
 * SUM(supplier_payments) is only reported.
 *
 * Usage (from pos_api/):
 *   npx tsx scripts/fix-supplier-invoice-returns.ts                 # dry run
 *   npx tsx scripts/fix-supplier-invoice-returns.ts --apply         # write
 *   npx tsx scripts/fix-supplier-invoice-returns.ts --business-id=<id> [--apply]
 */
import 'dotenv/config';
import {
  Prisma,
  PrismaClient,
  PurchaseReturnStatus,
  SupplierInvoiceStatus,
} from '@prisma/client';

const prisma = new PrismaClient();
const ZERO = new Prisma.Decimal(0);

type CliOptions = {
  apply: boolean;
  businessId: string | null;
};

type InvoiceCorrection = {
  invoiceId: string;
  invoiceNumber: string;
  businessId: string;
  goodsReceiptId: string;
  goodsReceiptNumber: string;
  goodsReceiptTotal: Prisma.Decimal;
  postedReturnsTotal: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  current: {
    grandTotal: Prisma.Decimal;
    outstandingAmount: Prisma.Decimal;
    status: SupplierInvoiceStatus;
  };
  expected: {
    grandTotal: Prisma.Decimal;
    outstandingAmount: Prisma.Decimal;
    status: SupplierInvoiceStatus;
  };
  unlinkedReturnIds: string[];
};

function parseCliOptions(argv: string[]): CliOptions {
  const apply = argv.includes('--apply');
  const businessArg = argv.find((arg) => arg.startsWith('--business-id='));
  const businessId = businessArg ? businessArg.slice('--business-id='.length).trim() : '';

  return {
    apply,
    businessId: businessId !== '' ? businessId : null,
  };
}

function resolveStatus(
  grandTotal: Prisma.Decimal,
  outstandingAmount: Prisma.Decimal,
  paidAmount: Prisma.Decimal,
): SupplierInvoiceStatus {
  const hasPayment = paidAmount.greaterThan(ZERO);

  if (grandTotal.lessThanOrEqualTo(ZERO) && !hasPayment) {
    return SupplierInvoiceStatus.VOID;
  }

  if (outstandingAmount.lessThanOrEqualTo(ZERO)) {
    return SupplierInvoiceStatus.PAID;
  }

  return hasPayment ? SupplierInvoiceStatus.PARTIALLY_PAID : SupplierInvoiceStatus.UNPAID;
}

function formatMoney(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

async function collectCorrections(options: CliOptions): Promise<InvoiceCorrection[]> {
  const invoices = await prisma.supplierInvoice.findMany({
    where: {
      goodsReceiptId: { not: null },
      status: { not: SupplierInvoiceStatus.VOID },
      ...(options.businessId ? { businessId: options.businessId } : {}),
    },
    select: {
      id: true,
      invoiceNumber: true,
      businessId: true,
      goodsReceiptId: true,
      status: true,
      grandTotal: true,
      paidAmount: true,
      outstandingAmount: true,
      goodsReceipt: {
        select: {
          receiptNumber: true,
          totalAmount: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const corrections: InvoiceCorrection[] = [];

  for (const invoice of invoices) {
    if (!invoice.goodsReceiptId || !invoice.goodsReceipt) {
      continue;
    }

    const postedReturns = await prisma.purchaseReturn.findMany({
      where: {
        businessId: invoice.businessId,
        goodsReceiptId: invoice.goodsReceiptId,
        status: PurchaseReturnStatus.POSTED,
      },
      select: {
        id: true,
        totalAmount: true,
        supplierInvoiceId: true,
      },
    });

    const postedReturnsTotal = postedReturns.reduce(
      (sum, item) => sum.plus(item.totalAmount),
      new Prisma.Decimal(0),
    );

    const rawGrandTotal = invoice.goodsReceipt.totalAmount.minus(postedReturnsTotal);
    const expectedGrandTotal = rawGrandTotal.lessThan(ZERO) ? ZERO : rawGrandTotal;
    const remaining = expectedGrandTotal.minus(invoice.paidAmount);
    const expectedOutstanding = remaining.lessThan(ZERO) ? ZERO : remaining;
    const expectedStatus = resolveStatus(
      expectedGrandTotal,
      expectedOutstanding,
      invoice.paidAmount,
    );

    const unlinkedReturnIds = postedReturns
      .filter((item) => item.supplierInvoiceId === null)
      .map((item) => item.id);

    const needsUpdate =
      !invoice.grandTotal.equals(expectedGrandTotal) ||
      !invoice.outstandingAmount.equals(expectedOutstanding) ||
      invoice.status !== expectedStatus ||
      unlinkedReturnIds.length > 0;

    if (!needsUpdate) {
      continue;
    }

    corrections.push({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      businessId: invoice.businessId,
      goodsReceiptId: invoice.goodsReceiptId,
      goodsReceiptNumber: invoice.goodsReceipt.receiptNumber,
      goodsReceiptTotal: invoice.goodsReceipt.totalAmount,
      postedReturnsTotal,
      paidAmount: invoice.paidAmount,
      current: {
        grandTotal: invoice.grandTotal,
        outstandingAmount: invoice.outstandingAmount,
        status: invoice.status,
      },
      expected: {
        grandTotal: expectedGrandTotal,
        outstandingAmount: expectedOutstanding,
        status: expectedStatus,
      },
      unlinkedReturnIds,
    });
  }

  return corrections;
}

async function reportPaidAmountMismatches(options: CliOptions): Promise<void> {
  const invoices = await prisma.supplierInvoice.findMany({
    where: {
      status: { not: SupplierInvoiceStatus.VOID },
      ...(options.businessId ? { businessId: options.businessId } : {}),
    },
    select: {
      invoiceNumber: true,
      paidAmount: true,
      payments: {
        select: { amount: true },
      },
    },
  });

  for (const invoice of invoices) {
    const paymentsTotal = invoice.payments.reduce(
      (sum, payment) => sum.plus(payment.amount),
      new Prisma.Decimal(0),
    );

    if (!paymentsTotal.equals(invoice.paidAmount)) {
      console.warn(
        `  [WARN] ${invoice.invoiceNumber}: paidAmount ${formatMoney(invoice.paidAmount)} ` +
          `!= SUM(payments) ${formatMoney(paymentsTotal)} (tidak diubah, cek manual)`,
      );
    }
  }
}

function printCorrection(correction: InvoiceCorrection): void {
  console.log(`- Invoice ${correction.invoiceNumber} (GR ${correction.goodsReceiptNumber})`);
  console.log(
    `    GR total ${formatMoney(correction.goodsReceiptTotal)} - retur POSTED ` +
      `${formatMoney(correction.postedReturnsTotal)} | dibayar ${formatMoney(correction.paidAmount)}`,
  );
  console.log(
    `    grandTotal   ${formatMoney(correction.current.grandTotal)} -> ${formatMoney(correction.expected.grandTotal)}`,
  );
  console.log(
    `    outstanding  ${formatMoney(correction.current.outstandingAmount)} -> ${formatMoney(correction.expected.outstandingAmount)}`,
  );
  console.log(`    status       ${correction.current.status} -> ${correction.expected.status}`);

  if (correction.unlinkedReturnIds.length > 0) {
    console.log(`    link retur   ${correction.unlinkedReturnIds.length} retur belum ter-link`);
  }

  const overpaid = correction.paidAmount.minus(correction.expected.grandTotal);

  if (overpaid.greaterThan(ZERO)) {
    console.log(
      `    [INFO] kelebihan bayar ke supplier ${formatMoney(overpaid)} (tidak tercatat, tindak lanjut manual)`,
    );
  }
}

async function applyCorrection(correction: InvoiceCorrection): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.supplierInvoice.update({
      where: { id: correction.invoiceId },
      data: {
        grandTotal: correction.expected.grandTotal,
        outstandingAmount: correction.expected.outstandingAmount,
        status: correction.expected.status,
      },
    });

    if (correction.unlinkedReturnIds.length > 0) {
      await tx.purchaseReturn.updateMany({
        where: {
          id: { in: correction.unlinkedReturnIds },
          businessId: correction.businessId,
          goodsReceiptId: correction.goodsReceiptId,
          supplierInvoiceId: null,
        },
        data: {
          supplierInvoiceId: correction.invoiceId,
        },
      });
    }
  });
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));

  console.log(
    `Mode: ${options.apply ? 'APPLY (menulis ke database)' : 'DRY RUN (tidak menulis)'}` +
      (options.businessId ? ` | businessId=${options.businessId}` : ''),
  );

  const corrections = await collectCorrections(options);

  if (corrections.length === 0) {
    console.log('Tidak ada invoice supplier yang perlu dikoreksi.');
  } else {
    console.log(`${corrections.length} invoice perlu dikoreksi:`);

    for (const correction of corrections) {
      printCorrection(correction);
    }
  }

  console.log('Cek paidAmount vs pembayaran:');
  await reportPaidAmountMismatches(options);

  if (!options.apply || corrections.length === 0) {
    if (!options.apply && corrections.length > 0) {
      console.log('Dry run selesai. Jalankan ulang dengan --apply untuk menyimpan koreksi.');
    }
    return;
  }

  for (const correction of corrections) {
    await applyCorrection(correction);
    console.log(`  [OK] ${correction.invoiceNumber} dikoreksi`);
  }

  console.log('Koreksi selesai.');
}

main()
  .catch((error: unknown) => {
    console.error('Koreksi gagal:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
