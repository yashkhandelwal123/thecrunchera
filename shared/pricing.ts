// Business rules confirmed by the owner on 26 September 2026.
export const SHIPPING_PAISE = 7000;
export const FREE_SHIPPING_FROM_PAISE = 35900;
export const PROMO_MIN_EXCLUSIVE_PAISE = 45000;
export const PROMO_CODE = "CRUNCH10";
export const MAX_ITEM_QUANTITY = 99;
export const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(paise / 100).replace("₹", "₹\u00a0");
export function toPaise(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error("Invalid catalog price");
  const [whole, fraction = ""] = value.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(result) || result <= 0) throw new Error("Invalid catalog price");
  return result;
}
export interface PricingQuote {
  subtotalPaise: number;
  shippingPaise: number;
  discountPaise: number;
  additionalChargesPaise: number;
  totalPaise: number;
  promoCode: string | null;
  promoError: string | null;
}
export function calculatePricing(subtotalPaise: number, code = ""): PricingQuote {
  if (!Number.isSafeInteger(subtotalPaise) || subtotalPaise < 0 || subtotalPaise > 100000000) throw new Error("Cart total is outside the supported range");
  const requested = code.trim().toUpperCase();
  let promoError: string | null = null;
  if (requested && requested !== PROMO_CODE) promoError = "That promo code is not valid. Check the code and try again.";
  else if (requested && subtotalPaise <= PROMO_MIN_EXCLUSIVE_PAISE) promoError = "CRUNCH10 applies when your product subtotal is above ₹450.";
  const promoCode = requested && !promoError ? requested : null;
  const discountPaise = promoCode ? Math.round(subtotalPaise * 10 / 100) : 0;
  const shippingPaise = subtotalPaise > 0 && subtotalPaise < FREE_SHIPPING_FROM_PAISE ? SHIPPING_PAISE : 0;
  return { subtotalPaise, shippingPaise, discountPaise, additionalChargesPaise: 0, totalPaise: subtotalPaise - discountPaise + shippingPaise, promoCode, promoError };
}
