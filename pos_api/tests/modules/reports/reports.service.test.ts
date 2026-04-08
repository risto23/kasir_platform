import { buildDateRangeUtc } from '../../../src/modules/reports/reports.service';

describe('reports.service buildDateRangeUtc', () => {
  it('builds inclusive UTC range for Asia/Jakarta', () => {
    const r = buildDateRangeUtc('2026-04-08', '2026-04-08', 'Asia/Jakarta');
    expect(r.dateFrom).toBe('2026-04-08');
    expect(r.dateTo).toBe('2026-04-08');
    expect(r.timezone).toBe('Asia/Jakarta');
    expect(r.startUtc.toISOString()).toBe('2026-04-07T17:00:00.000Z');
    expect(r.endUtc.toISOString()).toBe('2026-04-08T16:59:59.999Z');
  });

  it('accepts ISO string and normalizes date parts', () => {
    const r = buildDateRangeUtc('2026-04-08T10:12:00Z', '2026-04-10T20:00:00+07:00', 'Asia/Jakarta');
    expect(r.dateFrom).toBe('2026-04-08');
    expect(r.dateTo).toBe('2026-04-10');
  });
});