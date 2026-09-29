'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowRotateLeft,
  faBasketShopping,
  faCashRegister,
  faCheck,
  faMagnifyingGlass,
  faMinus,
  faPlus,
  faPrint,
  faTrashCan,
  faUtensils,
  faWallet,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import {
  addOrderItem,
  calculatePosSurcharge,
  createPayment,
  formatCurrency,
  getOrderDetail,
  getOutletPaymentMethods,
  getPosProducts,
  removeOrderItem,
  updateOrderItem,
  updateOrderStatus,
} from '@/lib/pos';
import { getReceiptByOrderId } from '@/lib/receipt';
import type {
  PosOrderResponse,
  PosOrderStatus,
  PosOutletPaymentMethod,
  PosProductItem,
} from '@/types/pos';
import type { ReceiptDetailResponse } from '@/types/receipt';
import ReceiptPrint from '@/components/receipt/receipt-print';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

function statusLabel(status: PosOrderStatus): string {
  const map: Record<PosOrderStatus, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Dikirim ke Kitchen',
    IN_PROGRESS: 'Sedang Dimasak',
    READY: 'Siap Disajikan',
    COMPLETED: 'Selesai',
    CANCELLED: 'Dibatalkan',
  };
  return map[status] ?? status;
}

function statusBadgeCls(status: PosOrderStatus): string {
  const map: Record<PosOrderStatus, string> = {
    DRAFT: 'bg-amber-100 text-amber-700',
    SUBMITTED: 'bg-sky-100 text-sky-700',
    IN_PROGRESS: 'bg-sky-100 text-sky-700',
    READY: 'bg-violet-100 text-violet-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-slate-100 text-slate-500',
  };
  return map[status] ?? 'bg-slate-100 text-slate-500';
}

type PaymentModalProps = {
  order: PosOrderResponse;
  paymentMethods: PosOutletPaymentMethod[];
  onPaid: () => void;
  onClose: () => void;
};

function PaymentModal({ order, paymentMethods, onPaid, onClose }: PaymentModalProps) {
  const [method, setMethod] = useState(paymentMethods[0]?.code ?? 'CASH');
  const [tendered, setTendered] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedMethod = paymentMethods.find((m) => m.code === method);
  const surcharge = selectedMethod
    ? calculatePosSurcharge(order.totalAmount, selectedMethod.surchargeRules)
    : 0;
  const grandTotal = order.totalAmount + surcharge;
  const tenderedNum = Number(tendered.replace(/\D/g, '')) || 0;
  const change = Math.max(0, tenderedNum - grandTotal);

  async function handlePay() {
    if (tenderedNum < grandTotal) {
      setError('Jumlah pembayaran kurang dari total');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createPayment({
        orderId: order.id,
        outletId: order.outletId,
        method,
        amountPaid: grandTotal,
        amountTendered: tenderedNum,
      });
      onPaid();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses pembayaran');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">Proses Pembayaran</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-1 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Diskon</span>
              <span className="text-red-500">-{formatCurrency(order.discountAmount)}</span>
            </div>
          )}
          {order.taxAmount > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Pajak</span>
              <span>{formatCurrency(order.taxAmount)}</span>
            </div>
          )}
          {order.serviceChargeAmount > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Service Charge</span>
              <span>{formatCurrency(order.serviceChargeAmount)}</span>
            </div>
          )}
          {surcharge > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Surcharge</span>
              <span>{formatCurrency(surcharge)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-slate-800 pt-1 border-t border-slate-200">
            <span>Total</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        <label className="block text-sm font-medium text-slate-700 mb-1">Metode Bayar</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {paymentMethods.length > 0
            ? paymentMethods.map((m) => (
                <button
                  key={m.code}
                  onClick={() => setMethod(m.code)}
                  className={`py-2 rounded-lg text-sm border transition-all ${
                    method === m.code
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'border-slate-300 text-slate-600 hover:border-sky-400'
                  }`}
                >
                  {m.name}
                </button>
              ))
            : ['CASH', 'QRIS', 'TRANSFER'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`py-2 rounded-lg text-sm border transition-all ${
                    method === m
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'border-slate-300 text-slate-600 hover:border-sky-400'
                  }`}
                >
                  {m}
                </button>
              ))}
        </div>

        <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah Diterima</label>
        <input
          type="number"
          value={tendered}
          onChange={(e) => setTendered(e.target.value)}
          placeholder={String(grandTotal)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 mb-2"
        />

        {tenderedNum >= grandTotal && (
          <p className="text-sm text-emerald-600 mb-3">
            Kembalian: <span className="font-semibold">{formatCurrency(change)}</span>
          </p>
        )}

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <button
          onClick={handlePay}
          disabled={loading || tenderedNum < grandTotal}
          className="w-full bg-emerald-600 text-white rounded-xl py-3 font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          <FontAwesomeIcon icon={faWallet} className="mr-2" />
          {loading ? 'Memproses...' : `Bayar ${formatCurrency(grandTotal)}`}
        </button>
      </div>
    </div>
  );
}

export default function DineInOrderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = typeof params.orderId === 'string' ? params.orderId : '';
  const outletId = searchParams.get('outletId') ?? '';

  const [order, setOrder] = useState<PosOrderResponse | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [error, setError] = useState('');

  const [products, setProducts] = useState<PosProductItem[]>([]);
  const [search, setSearch] = useState('');
  const [productsLoading, setProductsLoading] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState<PosOutletPaymentMethod[]>([]);
  const [showPayment, setShowPayment] = useState(false);

  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [statusChanging, setStatusChanging] = useState(false);

  const [receipt, setReceipt] = useState<ReceiptDetailResponse | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (orderId && outletId) {
      loadOrder();
      loadProducts();
      loadPaymentMethods();
    }
  }, [orderId, outletId]);

  async function loadOrder() {
    setLoadState('loading');
    setError('');
    try {
      const data = await getOrderDetail(orderId, outletId);
      setOrder(data);
      setLoadState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat order');
      setLoadState('error');
    }
  }

  async function loadProducts() {
    setProductsLoading(true);
    try {
      const data = await getPosProducts({ outletId, perPage: 100, status: 'ACTIVE' });
      setProducts(data.items);
    } catch (err) {
      console.error('Gagal memuat produk:', err);
    } finally {
      setProductsLoading(false);
    }
  }

  async function loadPaymentMethods() {
    try {
      const data = await getOutletPaymentMethods(outletId);
      setPaymentMethods(data);
    } catch {
      // silent
    }
  }

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.code ?? '').toLowerCase().includes(q) ||
        (p.barcode ?? '').toLowerCase().includes(q),
    );
  }, [products, search]);

  async function handleAddProduct(product: PosProductItem) {
    if (!order) return;
    setAddingProductId(product.id);
    try {
      const updated = await addOrderItem(order.id, {
        outletId,
        productId: product.id,
        quantity: 1,
      });
      setOrder(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menambah item');
    } finally {
      setAddingProductId(null);
    }
  }

  async function handleUpdateQty(itemId: string, currentQty: number, delta: number) {
    if (!order) return;
    const newQty = currentQty + delta;
    if (newQty < 1) return;
    setUpdatingItemId(itemId);
    try {
      const updated = await updateOrderItem(order.id, itemId, { outletId, quantity: newQty });
      setOrder(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengubah jumlah');
    } finally {
      setUpdatingItemId(null);
    }
  }

  async function handleRemoveItem(itemId: string) {
    if (!order) return;
    setRemovingItemId(itemId);
    try {
      const updated = await removeOrderItem(order.id, itemId, outletId);
      setOrder(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus item');
    } finally {
      setRemovingItemId(null);
    }
  }

  async function handleStatusChange(status: PosOrderStatus) {
    if (!order) return;
    setStatusChanging(true);
    try {
      const updated = await updateOrderStatus(order.id, outletId, status);
      setOrder(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengubah status');
    } finally {
      setStatusChanging(false);
    }
  }

  async function handlePaid() {
    setShowPayment(false);
    await loadOrder();
    // Auto load receipt
    try {
      const r = await getReceiptByOrderId(orderId, outletId);
      setReceipt(r);
      setShowReceipt(true);
    } catch {
      // silent — user can close and go back
    }
  }

  // Backend menolak ubah item jika paymentStatus bukan UNPAID dan menolak batal jika PAID/PARTIAL (409).
  const isPaymentLocked =
    order?.paymentStatus === 'PAID' || order?.paymentStatus === 'PARTIAL';
  const canAddItems =
    order &&
    order.orderType === 'DINE_IN' &&
    order.paymentStatus === 'UNPAID' &&
    ['DRAFT', 'SUBMITTED', 'IN_PROGRESS'].includes(order.status);
  const canCancel = !isPaymentLocked;

  const canSubmitKitchen = order?.status === 'DRAFT';
  const canPay = order && order.paymentStatus === 'UNPAID' && order.status !== 'CANCELLED';
  const canComplete =
    order?.paymentStatus === 'PAID' && order.status === 'READY';
  const isFinished = order && ['COMPLETED', 'CANCELLED'].includes(order.status);

  if (loadState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Memuat order...</div>
      </div>
    );
  }

  if (loadState === 'error' || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <p className="text-red-600 text-sm">{error || 'Order tidak ditemukan'}</p>
        <button
          onClick={() => router.push('/dashboard/pos/dine-in')}
          className="text-sky-600 text-sm underline"
        >
          Kembali ke Daftar Meja
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => router.push('/dashboard/pos/dine-in')}
          className="text-slate-500 hover:text-slate-700"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 text-sm truncate">
              {order.tableName ? `Meja ${order.tableName}` : 'Dine-In'}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadgeCls(order.status)}`}>
              {statusLabel(order.status)}
            </span>
          </div>
          <p className="text-xs text-slate-400">{order.orderNumber}</p>
        </div>
        <button
          onClick={loadOrder}
          className="text-slate-400 hover:text-sky-600 transition-colors"
        >
          <FontAwesomeIcon icon={faArrowRotateLeft} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left — Product catalog (only when order is active and can add items) */}
        {canAddItems && (
          <div className="w-full lg:w-1/2 flex flex-col border-r border-slate-200 bg-white overflow-hidden">
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari produk..."
                  className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {productsLoading ? (
                <div className="text-center py-8 text-slate-400 text-sm">Memuat produk...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">Produk tidak ditemukan</div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      disabled={addingProductId === product.id}
                      className="text-left border border-slate-200 rounded-xl p-3 hover:border-sky-400 hover:bg-sky-50 transition-all disabled:opacity-50"
                    >
                      <p className="text-sm font-medium text-slate-800 leading-tight line-clamp-2">
                        {product.name}
                      </p>
                      {product.unit && (
                        <p className="text-xs text-slate-400 mt-0.5">{product.unit}</p>
                      )}
                      <p className="text-sm font-semibold text-sky-600 mt-1">
                        {formatCurrency(product.effectivePrice)}
                      </p>
                      {addingProductId === product.id && (
                        <span className="text-xs text-sky-600">Menambah...</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right — Order detail */}
        <div className={`flex flex-col bg-white ${canAddItems ? 'hidden lg:flex lg:w-1/2' : 'w-full'} overflow-hidden`}>
          {/* Customer / Table info */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <FontAwesomeIcon icon={faUtensils} className="text-slate-400" />
              <span>
                {order.tableName && <strong className="text-slate-800">Meja {order.tableName}</strong>}
                {order.customerName && (
                  <span className="text-slate-500"> · {order.customerName}</span>
                )}
              </span>
            </div>
          </div>

          {/* Items list */}
          <div className="flex-1 overflow-y-auto p-4">
            {!order.items || order.items.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FontAwesomeIcon icon={faBasketShopping} className="text-3xl mb-2" />
                <p className="text-sm">Belum ada item. Pilih produk dari katalog.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {order.items.map((item) => {
                  const isUpdating = updatingItemId === item.id;
                  const isRemoving = removingItemId === item.id;
                  const busy = isUpdating || isRemoving;
                  return (
                    <div
                      key={item.id}
                      className={`py-2 border-b border-slate-100 last:border-0 ${busy ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-sm font-medium text-slate-800 truncate flex-1">{item.productName}</p>
                        <p className="text-sm font-semibold text-slate-800 shrink-0">
                          {formatCurrency(item.lineTotal)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        {canAddItems ? (
                          <div className="flex items-center gap-1">
                            <button
                              disabled={busy}
                              onClick={() => handleUpdateQty(item.id, Number(item.quantity), -1)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                            >
                              <FontAwesomeIcon icon={faMinus} className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-semibold text-slate-800">
                              {item.quantity}
                            </span>
                            <button
                              disabled={busy}
                              onClick={() => handleUpdateQty(item.id, Number(item.quantity), 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                            >
                              <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                            </button>
                            <span className="ml-1 text-xs text-slate-400">
                              × {formatCurrency(item.unitPrice)}
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">
                            {formatCurrency(item.unitPrice)} × {item.quantity}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          {item.lineDiscountAmount > 0 && (
                            <p className="text-xs text-red-400">-{formatCurrency(item.lineDiscountAmount)}</p>
                          )}
                          {canAddItems && (
                            <button
                              disabled={busy}
                              onClick={() => handleRemoveItem(item.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 disabled:opacity-40"
                            >
                              <FontAwesomeIcon icon={faTrashCan} className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="border-t border-slate-200 p-4 bg-white">
            <div className="space-y-1 text-sm mb-4">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Diskon</span>
                  <span className="text-red-500">-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              {order.taxAmount > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Pajak</span>
                  <span>{formatCurrency(order.taxAmount)}</span>
                </div>
              )}
              {order.serviceChargeAmount > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Service Charge</span>
                  <span>{formatCurrency(order.serviceChargeAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-slate-800 text-base pt-1 border-t border-slate-200">
                <span>Total</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>

            {/* Actions */}
            {!isFinished && (
              <div className="space-y-2">
                {canSubmitKitchen && (
                  <button
                    onClick={() => handleStatusChange('SUBMITTED')}
                    disabled={statusChanging || !order.items?.length}
                    className="w-full bg-sky-600 text-white rounded-xl py-3 font-medium text-sm hover:bg-sky-700 disabled:opacity-50 transition-colors"
                  >
                    <FontAwesomeIcon icon={faUtensils} className="mr-2" />
                    {statusChanging ? 'Mengirim...' : 'Kirim ke Kitchen'}
                  </button>
                )}

                {canPay && (
                  <button
                    onClick={() => setShowPayment(true)}
                    disabled={!order.items?.length}
                    className="w-full bg-emerald-600 text-white rounded-xl py-3 font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    <FontAwesomeIcon icon={faWallet} className="mr-2" />
                    Bayar {formatCurrency(order.totalAmount)}
                  </button>
                )}

                {canComplete && (
                  <button
                    onClick={() => handleStatusChange('COMPLETED')}
                    disabled={statusChanging}
                    className="w-full bg-emerald-600 text-white rounded-xl py-3 font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    <FontAwesomeIcon icon={faCheck} className="mr-2" />
                    {statusChanging ? 'Memproses...' : 'Selesaikan Order'}
                  </button>
                )}

                {isPaymentLocked && (
                  <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                    Order sudah dibayar. Item tidak bisa diubah dan order tidak bisa dibatalkan.
                  </p>
                )}

                {canCancel && (
                  <button
                    onClick={() => {
                      if (confirm('Batalkan order ini?')) handleStatusChange('CANCELLED');
                    }}
                    disabled={statusChanging}
                    className="w-full border border-red-300 text-red-500 rounded-xl py-2.5 font-medium text-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    <FontAwesomeIcon icon={faTrashCan} className="mr-2" />
                    Batalkan Order
                  </button>
                )}
              </div>
            )}

            {isFinished && (
              <div className="space-y-2">
                {receipt && (
                  <button
                    onClick={() => setShowReceipt(true)}
                    className="w-full border border-slate-300 text-slate-600 rounded-xl py-2.5 font-medium text-sm hover:bg-slate-50 transition-colors"
                  >
                    <FontAwesomeIcon icon={faPrint} className="mr-2" />
                    Cetak Struk
                  </button>
                )}
                <button
                  onClick={() => router.push('/dashboard/pos/dine-in')}
                  className="w-full bg-sky-600 text-white rounded-xl py-3 font-medium text-sm hover:bg-sky-700 transition-colors"
                >
                  <FontAwesomeIcon icon={faCashRegister} className="mr-2" />
                  Kembali ke Daftar Meja
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile toggle for product catalog */}
      {canAddItems && (
        <div className="lg:hidden fixed bottom-4 right-4">
          <button
            onClick={() => {/* mobile sheet — handled via flex on small screens */}}
            className="bg-sky-600 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center text-xl"
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>
      )}

      {/* Payment modal */}
      {showPayment && order && (
        <PaymentModal
          order={order}
          paymentMethods={paymentMethods}
          onPaid={handlePaid}
          onClose={() => setShowPayment(false)}
        />
      )}

      {/* Receipt modal */}
      {showReceipt && receipt && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Struk</h2>
              <button
                onClick={() => setShowReceipt(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <div className="p-4">
              <ReceiptPrint receipt={receipt} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
