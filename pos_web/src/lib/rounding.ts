/**
 * Rounding adjustment of an order total. Orders do not store it separately:
 * totalAmount = round(subtotal - discount + tax + service), so the difference
 * is the rounding (it also absorbs any extra non tax/service charge rule).
 * Payment surcharge is not part of order totalAmount and is excluded here.
 */
export function getOrderRoundingAmount(params: {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  totalAmount: number;
}): number {
  const beforeRounding =
    params.subtotal - params.discountAmount + params.taxAmount + params.serviceChargeAmount;
  const rounding = Math.round((params.totalAmount - beforeRounding) * 100) / 100;

  return Math.abs(rounding) < 0.01 ? 0 : rounding;
}
