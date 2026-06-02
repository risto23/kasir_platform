'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  createPromo,
  getPromoDiscountTypeLabel,
  getPromoFormMeta,
  getPromoOutletScopeLabel,
  getPromoTargetTypeLabel,
  updatePromo,
} from '@/lib/promo';
import type {
  PromoDiscountType,
  PromoFormMeta,
  PromoItem,
  PromoOutletScope,
  PromoPayload,
  PromoStatus,
  PromoTargetType,
} from '@/types/promo';

type PromoFormProps = {
  mode: 'create' | 'edit';
  promoId?: string;
  initialData?: PromoItem | null;
  onSuccess?: (promo: PromoItem) => void;
};

type PromoFormState = {
  name: string;
  description: string;
  targetType: PromoTargetType;
  categoryId: string;
  productId: string;
  targetTextValue: string;
  discountType: PromoDiscountType;
  discountValue: string;
  hasMinCharge: boolean;
  minChargeAmount: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: PromoStatus;
  outletScope: PromoOutletScope;
  selectedOutletIds: string[];
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultState(): PromoFormState {
  const today = getTodayDate();

  return {
    name: '',
    description: '',
    targetType: 'CATEGORY',
    categoryId: '',
    productId: '',
    targetTextValue: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    hasMinCharge: false,
    minChargeAmount: '',
    startDate: today,
    endDate: today,
    startTime: '00:00',
    endTime: '23:59',
    status: 'ACTIVE',
    outletScope: 'ALL_OUTLETS',
    selectedOutletIds: [],
  };
}

function mapInitialDataToState(data: PromoItem): PromoFormState {
  return {
    name: data.name ?? '',
    description: data.description ?? '',
    targetType: data.targetType,
    categoryId: data.categoryId ?? '',
    productId: data.productId ?? '',
    targetTextValue: data.targetTextValue ?? '',
    discountType: data.discountType,
    discountValue: data.discountValue ?? '',
    hasMinCharge: data.minChargeAmount != null,
    minChargeAmount: data.minChargeAmount ?? '',
    startDate: data.startDate,
    endDate: data.endDate,
    startTime: data.startTime,
    endTime: data.endTime,
    status: data.status,
    outletScope: data.outletScope ?? 'ALL_OUTLETS',
    selectedOutletIds: (data.selectedOutlets ?? []).map((item) => item.outletId),
  };
}

export function PromoForm({
  mode,
  promoId,
  initialData,
  onSuccess,
}: PromoFormProps) {
  const [meta, setMeta] = useState<PromoFormMeta | null>(null);
  const [form, setForm] = useState<PromoFormState>(
    initialData ? mapInitialDataToState(initialData) : getDefaultState(),
  );
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadMeta() {
      try {
        setLoadingMeta(true);
        setError('');

        const response = await getPromoFormMeta();

        if (!cancelled) {
          setMeta(response);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Gagal memuat meta promo');
        }
      } finally {
        if (!cancelled) {
          setLoadingMeta(false);
        }
      }
    }

    void loadMeta();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (initialData) {
      setForm(mapInitialDataToState(initialData));
    }
  }, [initialData]);

  const itemLabel = useMemo(() => {
    return meta?.businessType === 'RESTAURANT' ? 'Menu' : 'Produk';
  }, [meta?.businessType]);

  const activeCategories = useMemo(() => {
    return (meta?.categories ?? []).filter((item) => item.status === 'ACTIVE');
  }, [meta?.categories]);

  const activeProducts = useMemo(() => {
    return (meta?.products ?? []).filter((item) => item.status === 'ACTIVE');
  }, [meta?.products]);

  const activeOutlets = useMemo(() => {
    return (meta?.outlets ?? []).filter((item) => item.status === 'ACTIVE');
  }, [meta?.outlets]);

  function setField<K extends keyof PromoFormState>(
    key: K,
    value: PromoFormState[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function toggleSelectedOutlet(outletId: string) {
    setForm((prev) => {
      const exists = prev.selectedOutletIds.includes(outletId);

      return {
        ...prev,
        selectedOutletIds: exists
          ? prev.selectedOutletIds.filter((item) => item !== outletId)
          : [...prev.selectedOutletIds, outletId],
      };
    });
  }

  useEffect(() => {
    if (form.targetType !== 'CATEGORY' && form.categoryId) {
      setField('categoryId', '');
    }

    if (form.targetType !== 'PRODUCT' && form.productId) {
      setField('productId', '');
    }

    if (
      form.targetType !== 'PRODUCT_NAME' &&
      form.targetType !== 'BRAND' &&
      form.targetType !== 'UNIT' &&
      form.targetTextValue
    ) {
      setField('targetTextValue', '');
    }
  }, [form.targetType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (
      form.outletScope !== 'SELECTED_OUTLETS' &&
      form.selectedOutletIds.length > 0
    ) {
      setField('selectedOutletIds', []);
    }
  }, [form.outletScope]); // eslint-disable-line react-hooks/exhaustive-deps

  function validate() {
    if (!form.name.trim()) {
      return 'Nama promo wajib diisi';
    }

    if (form.targetType === 'CATEGORY' && !form.categoryId) {
      return 'Kategori target wajib dipilih';
    }

    if (form.targetType === 'PRODUCT' && !form.productId) {
      return `${itemLabel} target wajib dipilih`;
    }

    if (
      (form.targetType === 'PRODUCT_NAME' ||
        form.targetType === 'BRAND' ||
        form.targetType === 'UNIT') &&
      !form.targetTextValue.trim()
    ) {
      return 'Nilai target wajib diisi';
    }

    const discountValue = Number(form.discountValue);

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return 'Nilai diskon harus lebih dari 0';
    }

    if (form.discountType === 'PERCENTAGE' && discountValue > 100) {
      return 'Diskon persen maksimal 100';
    }

    if (!form.startDate || !form.endDate) {
      return 'Tanggal promo wajib diisi';
    }

    if (!form.startTime || !form.endTime) {
      return 'Jam promo wajib diisi';
    }

    if (form.endDate < form.startDate) {
      return 'Tanggal akhir tidak boleh lebih kecil dari tanggal mulai';
    }

    if (form.startDate === form.endDate && form.endTime < form.startTime) {
      return 'Jam akhir tidak boleh lebih kecil dari jam mulai';
    }

    if (form.hasMinCharge) {
      const minCharge = Number(form.minChargeAmount);
      if (!Number.isFinite(minCharge) || minCharge <= 0) {
        return 'Minimum pembelian harus lebih dari 0';
      }
    }

    if (
      form.outletScope === 'SELECTED_OUTLETS' &&
      form.selectedOutletIds.length === 0
    ) {
      return 'Minimal pilih 1 outlet untuk promo outlet tertentu';
    }

    return '';
  }

  function buildPayload(): PromoPayload {
    return {
      name: form.name.trim(),
      description: form.description.trim() ? form.description.trim() : null,
      targetType: form.targetType,
      categoryId: form.targetType === 'CATEGORY' ? form.categoryId : null,
      productId: form.targetType === 'PRODUCT' ? form.productId : null,
      targetTextValue:
        form.targetType === 'PRODUCT_NAME' ||
        form.targetType === 'BRAND' ||
        form.targetType === 'UNIT'
          ? form.targetTextValue.trim()
          : null,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minChargeAmount: form.hasMinCharge && form.minChargeAmount ? Number(form.minChargeAmount) : null,
      startDate: form.startDate,
      endDate: form.endDate,
      startTime: form.startTime,
      endTime: form.endTime,
      status: form.status,
      outletScope: form.outletScope,
      selectedOutletIds:
        form.outletScope === 'SELECTED_OUTLETS' ? form.selectedOutletIds : [],
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = buildPayload();
      const result =
        mode === 'create'
          ? await createPromo(payload)
          : await updatePromo(promoId as string, payload);

      onSuccess?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan promo');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingMeta) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p data-testid="promo-form-loading" className="text-sm text-slate-500">Memuat form promo...</p>
      </div>
    );
  }

  return (
    <form
      data-testid="promo-form" onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">
          {mode === 'create' ? 'Buat Promo' : 'Ubah Promo'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Sesuaikan target, diskon, periode, status, dan cakupan outlet promo.
        </p>
      </div>

      {error ? (
        <div data-testid="promo-error" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Nama Promo
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(event) => setField('name', event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            placeholder="Contoh: Promo Weekend" id="promo-name" data-testid="promo-name"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Deskripsi
          </label>
          <textarea
            value={form.description}
            onChange={(event) => setField('description', event.target.value)}
            rows={4}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            placeholder="Deskripsi promo"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Tipe Target
          </label>
          <select
            id="promo-target-type" data-testid="promo-target-type" value={form.targetType}
            onChange={(event) =>
              setField('targetType', event.target.value as PromoTargetType)
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          >
            {(meta?.targetTypes ?? []).map((type) => (
              <option key={type} value={type}>
                {getPromoTargetTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Scope Outlet
          </label>
          <select
            value={form.outletScope}
            onChange={(event) =>
              setField('outletScope', event.target.value as PromoOutletScope)
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          >
            {(meta?.outletScopes ?? []).map((scope) => (
              <option key={scope} value={scope}>
                {getPromoOutletScopeLabel(scope)}
              </option>
            ))}
          </select>
        </div>

        {form.targetType === 'CATEGORY' ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Kategori Target
            </label>
            <select
              id="promo-category" data-testid="promo-category" value={form.categoryId}
              onChange={(event) => setField('categoryId', event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            >
              <option value="">Pilih kategori</option>
              {activeCategories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {form.targetType === 'PRODUCT' ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {itemLabel} Target
            </label>
            <select
              value={form.productId}
              onChange={(event) => setField('productId', event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            >
              <option value="">Pilih {itemLabel.toLowerCase()}</option>
              {activeProducts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.brand ? ` - ${item.brand}` : ''}
                  {item.unit ? ` (${item.unit})` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {(form.targetType === 'PRODUCT_NAME' ||
          form.targetType === 'BRAND' ||
          form.targetType === 'UNIT') ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {form.targetType === 'PRODUCT_NAME'
                ? `Nama ${itemLabel}`
                : form.targetType === 'BRAND'
                  ? 'Brand'
                  : 'Satuan'}
            </label>
            <input
              type="text"
              value={form.targetTextValue}
              onChange={(event) => setField('targetTextValue', event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              placeholder="Masukkan nilai target"
            />
          </div>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Tipe Diskon
          </label>
          <select
            id="promo-discount-type" data-testid="promo-discount-type" value={form.discountType}
            onChange={(event) =>
              setField('discountType', event.target.value as PromoDiscountType)
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          >
            {(meta?.discountTypes ?? []).map((type) => (
              <option key={type} value={type}>
                {getPromoDiscountTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Nilai Diskon
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            id="promo-discount-value" data-testid="promo-discount-value" value={form.discountValue}
            onChange={(event) => setField('discountValue', event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            placeholder={form.discountType === 'PERCENTAGE' ? '10' : '5000'}
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-3 flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={form.hasMinCharge}
              onChange={(event) => {
                setField('hasMinCharge', event.target.checked);
                if (!event.target.checked) setField('minChargeAmount', '');
              }}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm font-medium text-slate-700">
              Syarat Minimum Pembelian
            </span>
          </label>
          {form.hasMinCharge ? (
            <div>
              <p className="mb-2 text-xs text-slate-500">
                Diskon hanya berlaku jika total pembelian produk yang ditarget mencapai nilai berikut.
              </p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">Rp</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.minChargeAmount}
                  onChange={(event) => setField('minChargeAmount', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-slate-500"
                  placeholder="50000"
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Outlet Berlaku
          </label>

          {form.outletScope === 'ALL_OUTLETS' ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Promo ini akan berlaku untuk semua outlet aktif dalam business.
            </div>
          ) : activeOutlets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Tidak ada outlet aktif yang bisa dipilih.
            </div>
          ) : (
            <div className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2">
              {activeOutlets.map((outlet) => {
                const checked = form.selectedOutletIds.includes(outlet.id);

                return (
                  <label
                    key={outlet.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                      checked
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelectedOutlet(outlet.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300"
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {outlet.name}
                      </div>
                      <div className="text-xs text-slate-500">{outlet.code}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Tanggal Mulai
          </label>
          <input
            type="date"
            value={form.startDate}
            onChange={(event) => setField('startDate', event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Tanggal Akhir
          </label>
          <input
            type="date"
            value={form.endDate}
            onChange={(event) => setField('endDate', event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Jam Mulai
          </label>
          <input
            type="time"
            value={form.startTime}
            onChange={(event) => setField('startTime', event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Jam Akhir
          </label>
          <input
            type="time"
            value={form.endTime}
            onChange={(event) => setField('endTime', event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Status Dasar
          </label>
          <select
            value={form.status}
            onChange={(event) => setField('status', event.target.value as PromoStatus)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          >
            {(meta?.statuses ?? []).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="submit" data-testid="promo-submit"
          disabled={submitting}
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? 'Menyimpan...'
            : mode === 'create'
              ? 'Simpan Promo'
              : 'Update Promo'}
        </button>
      </div>
    </form>
  );
}
