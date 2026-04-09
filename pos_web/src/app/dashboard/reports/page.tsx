'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faFilter, faRotateRight } from '@fortawesome/free-solid-svg-icons';

import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Outlet } from '@/types/outlet';
import type {
  BusinessGroupBy,
  BusinessSalesByOutlet,
  BusinessSalesReport,
  BusinessSalesTimeseries,
  OutletSalesReport,
  SalesTimeseriesPoint,
} from '@/types/report';
import {
  fetchBusinessSales,
  fetchOutletSales,
  exportOutletSalesCsv,
  exportBusinessSalesCsv,
  exportOutletSalesXlsx,
  exportBusinessSalesXlsx,
} from '@/lib/reports';

function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const maybeResp = err as { response?: { data?: { message?: string } }; message?: string };
    return maybeResp.response?.data?.message || maybeResp.message || 'Gagal memuat';
  }
  return 'Gagal memuat';
}

type QuickRange = 'TODAY' | '7D' | '30D' | 'CUSTOM';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function offsetDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatMoney(n: string | number): string {
  const v = typeof n === 'string' ? Number(n) : n;
  return (Number.isFinite(v) ? v : 0).toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'OUTLET' | 'BUSINESS'>('OUTLET');

  const [outletOptions, setOutletOptions] = useState<Outlet[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Per Outlet
  const [outletId, setOutletId] = useState('');
  const [oQuick, setOQuick] = useState<QuickRange>('7D');
  const [oDateFrom, setODateFrom] = useState(offsetDate(-6));
  const [oDateTo, setODateTo] = useState(today());
  const [oTimezone, setOTimezone] = useState('Asia/Jakarta');
  const [oLoading, setOLoading] = useState(false);
  const [oError, setOError] = useState<string | null>(null);
  const [oSummary, setOSummary] = useState<OutletSalesReport['summary'] | null>(null);
  const [oSeries, setOSeries] = useState<SalesTimeseriesPoint[]>([]);

  // Business (All Outlets)
  const [bOutletIds, setBOutletIds] = useState<string[]>([]);
  const [bGroupBy, setBGroupBy] = useState<BusinessGroupBy>('day');
  const [bQuick, setBQuick] = useState<QuickRange>('7D');
  const [bDateFrom, setBDateFrom] = useState(offsetDate(-6));
  const [bDateTo, setBDateTo] = useState(today());
  const [bTimezone, setBTimezone] = useState('Asia/Jakarta');
  const [bLoading, setBLoading] = useState(false);
  const [bError, setBError] = useState<string | null>(null);
  const [bSummary, setBSummary] = useState<BusinessSalesReport['summary'] | null>(null);
  const [bSeries, setBSeries] = useState<SalesTimeseriesPoint[]>([]);
  const [bOutletRows, setBOutletRows] = useState<BusinessSalesByOutlet['outlets']>([]);

  async function fetchOutlets() {
    try {
      setLoadingOptions(true);
      const resp = await api.get('/business/outlets', { params: { status: 'ACTIVE', limit: 100 } });
      const data = resp.data?.data;
      const items: Outlet[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setOutletOptions(items);
      if (!outletId && items.length > 0) setOutletId(items[0].id);
      if (bOutletIds.length === 0 && items.length > 0) setBOutletIds(items.map((x) => x.id));
    } catch {
      setOutletOptions([]);
    } finally {
      setLoadingOptions(false);
    }
  }

  useEffect(() => {
    void fetchOutlets();
  }, []);

  async function downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  async function exportOutlet() {
    if (!outletId) return;
    try {
      const blob = await exportOutletSalesCsv({ outletId, dateFrom: oDateFrom, dateTo: oDateTo, timezone: oTimezone });
      await downloadBlob(blob, `outlet-sales-${outletId}-${oDateFrom}-${oDateTo}.csv`);
    } catch (err) {
      setOError(getErrorMessage(err));
    }
  }

  async function exportOutletXlsx() {
    if (!outletId) return;
    try {
      const blob = await exportOutletSalesXlsx({ outletId, dateFrom: oDateFrom, dateTo: oDateTo, timezone: oTimezone });
      await downloadBlob(blob, `outlet-sales-${outletId}-${oDateFrom}-${oDateTo}.xlsx`);
    } catch (err) {
      setOError(getErrorMessage(err));
    }
  }

  async function exportBusiness() {
    try {
      const blob = await exportBusinessSalesCsv({ outletIds: bOutletIds, dateFrom: bDateFrom, dateTo: bDateTo, groupBy: bGroupBy, timezone: bTimezone });
      const name = bGroupBy === 'outlet' ? 'business-by-outlet' : 'business-timeseries';
      await downloadBlob(blob, `${name}-${bDateFrom}-${bDateTo}.csv`);
    } catch (err) {
      setBError(getErrorMessage(err));
    }
  }

  async function exportBusinessXlsx() {
    try {
      const blob = await exportBusinessSalesXlsx({ outletIds: bOutletIds, dateFrom: bDateFrom, dateTo: bDateTo, groupBy: bGroupBy, timezone: bTimezone });
      const name = bGroupBy === 'outlet' ? 'business-by-outlet' : 'business-timeseries';
      await downloadBlob(blob, `${name}-${bDateFrom}-${bDateTo}.xlsx`);
    } catch (err) {
      setBError(getErrorMessage(err));
    }
  }

  
  async function loadOutlet() {
    if (!outletId) return;
    try {
      setOLoading(true);
      setOError(null);
      setOSummary(null);
      setOSeries([]);
      const data = await fetchOutletSales({ outletId, dateFrom: oDateFrom, dateTo: oDateTo, timezone: oTimezone });
      setOSummary(data.summary);
      setOSeries(data.timeseries);
    } catch (err) {
      setOError(getErrorMessage(err));
    } finally {
      setOLoading(false);
    }
  }

  async function loadBusiness() {
    try {
      setBLoading(true);
      setBError(null);
      setBSummary(null as any);
      setBSeries([]);
      setBOutletRows([] as any);
      const data = await fetchBusinessSales({ outletIds: bOutletIds, dateFrom: bDateFrom, dateTo: bDateTo, groupBy: bGroupBy, timezone: bTimezone });
      if ((data as any).timeseries) {
        const r = data as BusinessSalesTimeseries;
        setBSummary(r.summary);
        setBSeries(r.timeseries);
      } else {
        const r = data as BusinessSalesByOutlet;
        setBSummary(r.summary);
        setBOutletRows(r.outlets);
      }
    } catch (err) {
      setBError(getErrorMessage(err));
    } finally {
      setBLoading(false);
    }
  }
  function applyQuickRange(which: 'O' | 'B', q: QuickRange) {
    const set = which === 'O'
      ? (a: string, b: string) => { setODateFrom(a); setODateTo(b); setOQuick(q); }
      : (a: string, b: string) => { setBDateFrom(a); setBDateTo(b); setBQuick(q); };

    if (q === 'TODAY') set(today(), today());
    if (q === '7D') set(offsetDate(-6), today());
    if (q === '30D') set(offsetDate(-29), today());
  }

  const selectedOutletName = useMemo(
    () => outletOptions.find((o) => o.id === outletId)?.name || '',
    [outletId, outletOptions],
  );

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">
          <FontAwesomeIcon icon={faChartLine} className="mr-2 h-5 w-5" /> Reports
        </h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-1 text-sm">
          <button className={`rounded-lg px-3 py-1.5 ${activeTab === 'OUTLET' ? 'bg-white shadow' : ''}`} onClick={() => setActiveTab('OUTLET')}>Per Outlet</button>
          <button className={`rounded-lg px-3 py-1.5 ${activeTab === 'BUSINESS' ? 'bg-white shadow ml-1' : 'ml-1'}`} onClick={() => setActiveTab('BUSINESS')}>Semua Outlet</button>
        </div>

        {activeTab === 'OUTLET' ? (
          <div>
            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-4">
                <label className="mb-1 block text-xs font-medium text-slate-600">Outlet</label>
                <select value={outletId} onChange={(e) => setOutletId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500">
                  <option value="" disabled>Pilih outlet</option>
                  {outletOptions.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-4">
                <label className="mb-1 block text-xs font-medium text-slate-600">Periode</label>
                <div className="inline-flex gap-2 text-xs">
                  {(['TODAY','7D','30D','CUSTOM'] as QuickRange[]).map((q) => (
                    <button key={q} onClick={() => (q !== 'CUSTOM' ? applyQuickRange('O', q) : setOQuick('CUSTOM'))} className={`rounded-lg border px-2 py-1 ${oQuick === q ? 'border-blue-500 text-blue-600' : 'border-slate-300 text-slate-600'}`}>{q}</button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-4 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Dari</label>
                  <Input type="date" value={oDateFrom} onChange={(e) => setODateFrom(e.target.value)} disabled={oQuick !== 'CUSTOM'} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Sampai</label>
                  <Input type="date" value={oDateTo} onChange={(e) => setODateTo(e.target.value)} disabled={oQuick !== 'CUSTOM'} />
                </div>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-700"><FontAwesomeIcon icon={faFilter} className="h-3 w-3" /> Outlet: {selectedOutletName || '-'}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-700">Periode: {oDateFrom} - {oDateTo}</span>
                {oTimezone && oTimezone !== 'Asia/Jakarta' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-700">TZ: {oTimezone}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input className="w-40" placeholder="Timezone (opsional)" value={oTimezone} onChange={(e) => setOTimezone(e.target.value)} />
                <Button onClick={() => void loadOutlet()} disabled={oLoading || !outletId}>Load</Button>
                <Button variant="outline" onClick={() => void exportOutlet()}>Export CSV</Button>
                <Button variant="outline" onClick={() => void exportOutletXlsx()}>Export XLSX</Button>
                <Button variant="outline" onClick={() => { setOQuick('7D'); setODateFrom(offsetDate(-6)); setODateTo(today()); setOTimezone('Asia/Jakarta'); }} title="Reset"><FontAwesomeIcon icon={faRotateRight} className="h-3 w-3" /></Button>
              </div>
            </div>

            {oError && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">{oError}</div>}

            {oSummary ? (
              <div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                  <SummaryCard label="Orders" value={oSummary.orders} />
                  <SummaryCard label="Net Sales" value={formatMoney(oSummary.net)} />
                  <SummaryCard label="Gross" value={formatMoney(oSummary.gross)} />
                  <SummaryCard label="Discount" value={formatMoney(oSummary.discount)} />
                  <SummaryCard label="Tax" value={formatMoney(oSummary.tax)} />
                  <SummaryCard label="Service" value={formatMoney(oSummary.service)} />
                  <SummaryCard label="Items" value={oSummary.items} />
                  <SummaryCard label="AOV" value={formatMoney(oSummary.aov)} />
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left">
                      <tr>
                        <Th>Date</Th>
                        <Th>Orders</Th>
                        <Th>Gross</Th>
                        <Th>Discount</Th>
                        <Th>Tax</Th>
                        <Th>Service</Th>
                        <Th>Net</Th>
                        <Th>Items</Th>
                        <Th>AOV</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {oSeries.map((row) => {
                        const aov = row.orders > 0 ? Number(row.net) / row.orders : 0;
                        return (
                          <tr key={row.date} className="hover:bg-slate-50">
                            <Td>{row.date}</Td>
                            <Td>{row.orders}</Td>
                            <Td>{formatMoney(row.gross)}</Td>
                            <Td>{formatMoney(row.discount)}</Td>
                            <Td>{formatMoney(row.tax)}</Td>
                            <Td>{formatMoney(row.service)}</Td>
                            <Td>{formatMoney(row.net)}</Td>
                            <Td>{row.items}</Td>
                            <Td>{formatMoney(aov)}</Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">{oLoading ? 'Memuat...' : 'Silakan pilih filter lalu klik Load'}</div>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-4">
                <label className="mb-1 block text-xs font-medium text-slate-600">Outlet (opsional)</label>
                <div className="max-h-32 overflow-auto rounded-lg border border-slate-300 p-2">
                  {outletOptions.map((o) => (
                    <label key={o.id} className="mb-1 flex items-center gap-2 text-xs text-slate-700">
                      <input type="checkbox" checked={bOutletIds.includes(o.id)} onChange={(e) => setBOutletIds((prev) => e.target.checked ? Array.from(new Set([...prev, o.id])) : prev.filter((x) => x !== o.id))} />
                      <span>{o.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-4">
                <label className="mb-1 block text-xs font-medium text-slate-600">Periode</label>
                <div className="inline-flex gap-2 text-xs">
                  {(['TODAY','7D','30D','CUSTOM'] as QuickRange[]).map((q) => (
                    <button key={q} onClick={() => (q !== 'CUSTOM' ? applyQuickRange('B', q) : setBQuick('CUSTOM'))} className={`rounded-lg border px-2 py-1 ${bQuick === q ? 'border-blue-500 text-blue-600' : 'border-slate-300 text-slate-600'}`}>{q}</button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-4 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Dari</label>
                  <Input type="date" value={bDateFrom} onChange={(e) => setBDateFrom(e.target.value)} disabled={bQuick !== 'CUSTOM'} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Sampai</label>
                  <Input type="date" value={bDateTo} onChange={(e) => setBDateTo(e.target.value)} disabled={bQuick !== 'CUSTOM'} />
                </div>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-700"><FontAwesomeIcon icon={faFilter} className="h-3 w-3" /> Outlet: {bOutletIds.length > 0 ? `${bOutletIds.length} selected` : 'Semua'}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-700">Periode: {bDateFrom} - {bDateTo}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-700">Group: {bGroupBy}</span>
                {bTimezone && bTimezone !== 'Asia/Jakarta' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-700">TZ: {bTimezone}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-2 text-xs">
                  <label className="inline-flex items-center gap-1"><input type="radio" name="groupBy" value="day" checked={bGroupBy === 'day'} onChange={() => setBGroupBy('day')} /> <span>per Hari</span></label>
                  <label className="inline-flex items-center gap-1"><input type="radio" name="groupBy" value="outlet" checked={bGroupBy === 'outlet'} onChange={() => setBGroupBy('outlet')} /> <span>per Outlet</span></label>
                </div>
                <Input className="w-40" placeholder="Timezone (opsional)" value={bTimezone} onChange={(e) => setBTimezone(e.target.value)} />
                <Button onClick={() => void loadBusiness()} disabled={bLoading}>Load</Button>
                <Button variant="outline" onClick={() => void exportBusiness()}>Export CSV</Button>
                <Button variant="outline" onClick={() => void exportBusinessXlsx()}>Export XLSX</Button>
                <Button variant="outline" onClick={() => { setBQuick('7D'); setBDateFrom(offsetDate(-6)); setBDateTo(today()); setBTimezone('Asia/Jakarta'); setBGroupBy('day'); }} title="Reset"><FontAwesomeIcon icon={faRotateRight} className="h-3 w-3" /></Button>
              </div>
            </div>

            {bError && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">{bError}</div>}

            {bSummary ? (
              <div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                  <SummaryCard label="Orders" value={bSummary.orders} />
                  <SummaryCard label="Net Sales" value={formatMoney(bSummary.net)} />
                  <SummaryCard label="Gross" value={formatMoney(bSummary.gross)} />
                  <SummaryCard label="Discount" value={formatMoney(bSummary.discount)} />
                  <SummaryCard label="Tax" value={formatMoney(bSummary.tax)} />
                  <SummaryCard label="Service" value={formatMoney(bSummary.service)} />
                  <SummaryCard label="Items" value={bSummary.items} />
                  <SummaryCard label="AOV" value={formatMoney(bSummary.aov)} />
                </div>

                {bSummary.refunds && (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <SummaryCard label="Refund Count" value={bSummary.refunds.count} />
                    <SummaryCard label="Refund Amount" value={formatMoney(bSummary.refunds.amount)} />
                  </div>
                )}

                {bGroupBy === 'day' ? (
                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left">
                        <tr>
                          <Th>Date</Th>
                          <Th>Orders</Th>
                          <Th>Gross</Th>
                          <Th>Discount</Th>
                          <Th>Tax</Th>
                          <Th>Service</Th>
                          <Th>Net</Th>
                          <Th>Items</Th>
                          <Th>AOV</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {bSeries.map((row) => {
                          const aov = row.orders > 0 ? Number(row.net) / row.orders : 0;
                          return (
                            <tr key={row.date} className="hover:bg-slate-50">
                              <Td>{row.date}</Td>
                              <Td>{row.orders}</Td>
                              <Td>{formatMoney(row.gross)}</Td>
                              <Td>{formatMoney(row.discount)}</Td>
                              <Td>{formatMoney(row.tax)}</Td>
                              <Td>{formatMoney(row.service)}</Td>
                              <Td>{formatMoney(row.net)}</Td>
                              <Td>{row.items}</Td>
                              <Td>{formatMoney(aov)}</Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left">
                        <tr>
                          <Th>Outlet</Th>
                          <Th>Orders</Th>
                          <Th>Gross</Th>
                          <Th>Discount</Th>
                          <Th>Tax</Th>
                          <Th>Service</Th>
                          <Th>Net</Th>
                          <Th>Items</Th>
                          <Th>AOV</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {bOutletRows.map((row) => (
                          <tr key={row.outletId} className="hover:bg-slate-50">
                            <Td>{row.outletName}</Td>
                            <Td>{row.orders}</Td>
                            <Td>{formatMoney(row.gross)}</Td>
                            <Td>{formatMoney(row.discount)}</Td>
                            <Td>{formatMoney(row.tax)}</Td>
                            <Td>{formatMoney(row.service)}</Td>
                            <Td>{formatMoney(row.net)}</Td>
                            <Td>{row.items}</Td>
                            <Td>{formatMoney(row.aov)}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">{bLoading ? 'Memuat...' : 'Silakan pilih filter lalu klik Load'}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 text-slate-700">{children}</td>;
}


