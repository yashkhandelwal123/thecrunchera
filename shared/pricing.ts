export const FREE_SHIPPING_THRESHOLD = 359;
export const FLAT_SHIPPING_CHARGE = 70;
export const PROMO_CODE = "CRUNCH10";
export const PROMO_PERCENT = 10;

export interface PricingResult {
  subtotal: number;
  discountAmount: number;
  shippingCharge: number;
  total: number;
  promoCode: string | null;
  promoEligible: boolean;
  promoApplied: boolean;
  amountUntilEligible: number;
}

const money = (value: number) => Number(value.toFixed(2));

export function normalizePromoCode(code?: string | null): string {
  return (code ?? "").trim().toUpperCase();
}

export function calculatePricing(
  subtotalInput: number,
  promoCodeInput?: string | null,
): PricingResult {
  const subtotal = money(Math.max(0, subtotalInput));
  const promoEligible = subtotal >= FREE_SHIPPING_THRESHOLD;
  const normalizedPromo = normalizePromoCode(promoCodeInput);
  const promoApplied = promoEligible && normalizedPromo === PROMO_CODE;
  const discountAmount = promoApplied
    ? money((subtotal * PROMO_PERCENT) / 100)
    : 0;
  const shippingCharge = promoEligible ? 0 : FLAT_SHIPPING_CHARGE;
  const total = money(subtotal - discountAmount + shippingCharge);

  return {
    subtotal,
    discountAmount,
    shippingCharge,
    total,
    promoCode: promoApplied ? PROMO_CODE : null,
    promoEligible,
    promoApplied,
    amountUntilEligible: promoEligible
      ? 0
      : money(FREE_SHIPPING_THRESHOLD - subtotal),
  };
}
