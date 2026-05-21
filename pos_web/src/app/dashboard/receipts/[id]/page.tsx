// pos_web/src/app/dashboard/receipts/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useParams } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faClockRotateLeft,
  faPrint,
  faReceipt,
  faTriangleExclamation,
  faWallet,
} from '@fortawesome/free-solid-svg-icons';

import ReceiptPrint from '@/components/receipt/receipt-print';
import { getReceiptDetail } from '@/lib/receipt';
import type { ReceiptDetailResponse } from '@/types/receipt';

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export default function ReceiptDetailPage() {
  const params = useParams<{ id: string }>();
  const receiptId = typeof params?.id === 'string' ? params.id : '';

  const [receipt, setReceipt] = useState<ReceiptDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadReceipt() {
      if (!receiptId) {
        setErrorMessage('Receipt ID tidak valid');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage('');

        const detail = await getReceiptDetail(receiptId);
        setReceipt(detail);
      } catch (error: unknown) {
        setErrorMessage(getErrorMessage(error, 'Gagal memuat detail receipt'));
      } finally {
        setLoading(false);
      }
    }

    void loadReceipt();
  }, [receiptId]);

  function handlePrint() {
    if (typeof window === 'undefined') {
      return;
    }

    window.print();
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
              <FontAwesomeIcon icon={faReceipt} className="h-3 w-3" />
              Receipt Detail
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              Detail Struk
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Halaman untuk buka receipt lama dan print ulang dari histori transaksi atau histori payment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <Link
              href="/dashboard/payments/history"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FontAwesomeIcon icon={faWallet} className="h-4 w-4" />
              Ke Payment History
            </Link>

            <Link
              href="/dashboard/pos/history"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FontAwesomeIcon icon={faClockRotateLeft} className="h-4 w-4" />
              Ke Histori Transaksi
            </Link>

            <Link
              href="/dashboard/pos"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
              Kembali ke POS
            </Link>

            {receipt && !receipt.deletedAt && (
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FontAwesomeIcon icon={faPrint} className="h-4 w-4" />
                Print Ulang
              </button>
            )}
          </div>
        </div>
      </section>

      {receipt?.deletedAt && (
        <section className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 shadow-sm sm:px-6">
          <div className="flex items-center gap-3 text-sm text-rose-700">
            <FontAwesomeIcon icon={faTriangleExclamation} className="h-4 w-4 shrink-0" />
            <span>
              <span className="font-semibold">Receipt ini telah dihapus</span> dan tidak dihitung dalam laporan.
              Dihapus pada {new Date(receipt.deletedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.
            </span>
          </div>
        </section>
      )}

      {loading ? (
        <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-10 shadow-sm sm:px-6">
          <div className="mx-auto max-w-[420px] animate-pulse rounded-[24px] bg-slate-100 p-10" />
        </section>
      ) : errorMessage ? (
        <section className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm sm:px-6">
          {errorMessage}
        </section>
      ) : receipt ? (
        <section className="rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-5 shadow-sm sm:px-6">
          <ReceiptPrint receipt={receipt} showPrintButton={false} />
        </section>
      ) : (
        <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500 shadow-sm sm:px-6">
          Receipt tidak ditemukan.
        </section>
      )}
    </div>
  );
}