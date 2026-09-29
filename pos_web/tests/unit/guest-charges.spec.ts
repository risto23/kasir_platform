import { describe, expect, it } from 'vitest';
import { calculateGuestCharges } from '@/lib/guest';

describe('calculateGuestCharges', () => {
  it('applies tax, service and CEIL rounding like the backend (GUEST-0002 case)', () => {
    const result = calculateGuestCharges(
      33200,
      [
        { key: 'TAX', label: 'Tax', type: 'PERCENTAGE', value: 10 },
        { key: 'SERVICE', label: 'Service', type: 'PERCENTAGE', value: 5 },
      ],
      { enabled: true, method: 'CEIL', unit: 100 },
    );

    expect(result.taxAmount).toBe(3320);
    expect(result.serviceChargeAmount).toBe(1660);
    expect(result.grandTotal).toBe(38200);
  });

  it('adds fixed and non tax/service charges', () => {
    const result = calculateGuestCharges(
      10000,
      [
        { key: 'SERVICE', label: 'Service', type: 'FIXED_AMOUNT', value: 2000 },
        { key: 'PACKING', label: 'Packing', type: 'FIXED_AMOUNT', value: 500 },
      ],
      { enabled: false, method: 'CEIL', unit: 100 },
    );

    expect(result.taxAmount).toBe(0);
    expect(result.serviceChargeAmount).toBe(2000);
    expect(result.otherChargeAmount).toBe(500);
    expect(result.grandTotal).toBe(12500);
  });

  it('returns the subtotal when the API sends no charge settings', () => {
    const result = calculateGuestCharges(15000, undefined, undefined);

    expect(result.taxAmount).toBe(0);
    expect(result.serviceChargeAmount).toBe(0);
    expect(result.grandTotal).toBe(15000);
  });
});
