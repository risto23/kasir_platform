/**
 * One-off correction: reverse a single supplier credit usage (e.g. a credit
 * applied to an invoice only for testing).
 *
 * For the given usageNumber it:
 *   - APPLY_TO_INVOICE: takes the amount back off the target invoice
 *       paidAmount -= amount
 *       outstandingAmount = max(grandTotal - paidAmount, 0)
 *       status = UNPAID | PARTIALLY_PAID | PAID
 *   - REFUND: nothing on invoices (money was returned by the supplier)
 *   - restores the credit: usedAmount -= amount, remainingAmount += amount,
 *     status OPEN
 *   - deletes the usage row
 * all in one transaction. Dry run by default.
 *
 * Usage (from pos_api/):
 *   npx tsx scripts/reverse-supplier-credit-usage.ts --usage=SCU-20260929-0001          # dry run
 *   npx tsx scripts/reverse-supplier-credit-usage.ts --usage=SCU-20260929-0001 --apply  # write
 */
import 'dotenv/config';
import {
  Prisma,
  PrismaClient,
  SupplierCreditStatus,
  SupplierCreditUsageType,
  SupplierInvoiceStatus,
} from '@prisma/client';

const prisma = new PrismaClient();
const ZERO = new Prisma.Decimal(0);

type CliOptions = {
  apply: boolean;
  usageNumber: string;
};

type InvoiceReversal = {
  id: string;
  invoiceNumber: string;
  current: {
    paidAmount: Prisma.Decimal;
    outstandingAmount: Prisma.Decimal;
    status: SupplierInvoiceStatus;
  };
  next: {
    paidAmount: Prisma.Decimal;
    outstandingAmount: Prisma.Decimal;
    status: SupplierInvoiceStatus;
  };
};

function parseCliOptions(argv: string[]): CliOptions {
  const usageArg = argv.find((arg) => arg.startsWith('--usage='));
  const usageNumber = usageArg ? usageArg.slice('--usage='.length).trim() : '';

  if (usageNumber === '') {
    throw new Error('Wajib isi --usage=<usageNumber>, contoh --usage=SCU-20260929-0001');
  }

  return {
    apply: argv.includes('--apply'),
    usageNumber,
  };
}

function formatMoney(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

function resolveInvoiceStatus(
  paidAmount: Prisma.Decimal,
  outstandingAmount: Prisma.Decimal,
): SupplierInvoiceStatus {
  if (outstandingAmount.lessThanOrEqualTo(ZERO)) {
    return SupplierInvoiceStatus.PAID;
  }

  return paidAmount.greaterThan(ZERO)
    ? SupplierInvoiceStatus.PARTIALLY_PAID
    : SupplierInvoiceStatus.UNPAID;
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));

  console.log(
    `Mode: ${options.apply ? 'APPLY (menulis ke database)' : 'DRY RUN (tidak menulis)'} | usage=${options.usageNumber}`,
  );

  const usage = await prisma.supplierCreditUsage.findUnique({
    where: { usageNumber: options.usageNumber },
    include: {
      supplierCredit: {
        select: {
          id: true,
          creditNumber: true,
          status: true,
          amount: true,
          usedAmount: true,
          remainingAmount: true,
        },
      },
      supplierInvoice: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          grandTotal: true,
          paidAmount: true,
          outstandingAmount: true,
        },
      },
    },
  });

  if (!usage) {
    throw new Error(`Usage ${options.usageNumber} tidak ditemukan.`);
  }

  const credit = usage.supplierCredit;
  const nextUsed = credit.usedAmount.minus(usage.amount);
  const nextRemaining = credit.remainingAmount.plus(usage.amount);

  if (nextUsed.lessThan(ZERO) || nextRemaining.greaterThan(credit.amount)) {
    throw new Error(
      `Data kredit ${credit.creditNumber} tidak konsisten (used ${formatMoney(credit.usedAmount)}, ` +
        `remaining ${formatMoney(credit.remainingAmount)}). Cek manual.`,
    );
  }

  let invoiceReversal: InvoiceReversal | null = null;

  if (usage.type === SupplierCreditUsageType.APPLY_TO_INVOICE) {
    const invoice = usage.supplierInvoice;

    if (!invoice) {
      throw new Error(`Invoice untuk usage ${options.usageNumber} tidak ditemukan.`);
    }

    if (invoice.status === SupplierInvoiceStatus.VOID) {
      throw new Error(`Invoice ${invoice.invoiceNumber} sudah VOID. Cek manual.`);
    }

    const nextPaid = invoice.paidAmount.minus(usage.amount);

    if (nextPaid.lessThan(ZERO)) {
      throw new Error(
        `paidAmount invoice ${invoice.invoiceNumber} (${formatMoney(invoice.paidAmount)}) lebih kecil ` +
          `dari usage ${formatMoney(usage.amount)}. Cek manual.`,
      );
    }

    const remaining = invoice.grandTotal.minus(nextPaid);
    const nextOutstanding = remaining.lessThan(ZERO) ? ZERO : remaining;

    invoiceReversal = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      current: {
        paidAmount: invoice.paidAmount,
        outstandingAmount: invoice.outstandingAmount,
        status: invoice.status,
      },
      next: {
        paidAmount: nextPaid,
        outstandingAmount: nextOutstanding,
        status: resolveInvoiceStatus(nextPaid, nextOutstanding),
      },
    };
  }

  console.log(`- Usage ${usage.usageNumber} (${usage.type}) ${formatMoney(usage.amount)} akan dihapus`);
  console.log(`- Kredit ${credit.creditNumber}`);
  console.log(`    used       ${formatMoney(credit.usedAmount)} -> ${formatMoney(nextUsed)}`);
  console.log(`    remaining  ${formatMoney(credit.remainingAmount)} -> ${formatMoney(nextRemaining)}`);
  console.log(`    status     ${credit.status} -> ${SupplierCreditStatus.OPEN}`);

  if (invoiceReversal) {
    console.log(`- Invoice ${invoiceReversal.invoiceNumber}`);
    console.log(
      `    paid        ${formatMoney(invoiceReversal.current.paidAmount)} -> ${formatMoney(invoiceReversal.next.paidAmount)}`,
    );
    console.log(
      `    outstanding ${formatMoney(invoiceReversal.current.outstandingAmount)} -> ${formatMoney(invoiceReversal.next.outstandingAmount)}`,
    );
    console.log(`    status      ${invoiceReversal.current.status} -> ${invoiceReversal.next.status}`);
  }

  if (!options.apply) {
    console.log('Dry run selesai. Jalankan ulang dengan --apply untuk menyimpan koreksi.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Re-check inside the transaction so a concurrent change is not overwritten.
    const creditUpdated = await tx.supplierCredit.updateMany({
      where: {
        id: credit.id,
        usedAmount: credit.usedAmount,
        remainingAmount: credit.remainingAmount,
      },
      data: {
        usedAmount: nextUsed,
        remainingAmount: nextRemaining,
        status: SupplierCreditStatus.OPEN,
      },
    });

    if (creditUpdated.count !== 1) {
      throw new Error(`Kredit ${credit.creditNumber} berubah saat koreksi. Jalankan ulang dry run.`);
    }

    if (invoiceReversal) {
      const invoiceUpdated = await tx.supplierInvoice.updateMany({
        where: {
          id: invoiceReversal.id,
          paidAmount: invoiceReversal.current.paidAmount,
          outstandingAmount: invoiceReversal.current.outstandingAmount,
        },
        data: {
          paidAmount: invoiceReversal.next.paidAmount,
          outstandingAmount: invoiceReversal.next.outstandingAmount,
          status: invoiceReversal.next.status,
        },
      });

      if (invoiceUpdated.count !== 1) {
        throw new Error(
          `Invoice ${invoiceReversal.invoiceNumber} berubah saat koreksi. Jalankan ulang dry run.`,
        );
      }
    }

    await tx.supplierCreditUsage.delete({
      where: { id: usage.id },
    });
  });

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
