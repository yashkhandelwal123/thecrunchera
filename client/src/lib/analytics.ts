// Public GA4 web-stream identifier; never put a Measurement Protocol secret here.
export const MEASUREMENT_ID = "G-Y4RDB3EG4E";
type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: any[]) => void };
const pending = new Map<string, number>();
const sent = new Set<string>();
const round = (n: number) => Math.round(n * 100) / 100;
export interface AnalyticsLine { productId: string; productName: string; unitPrice: string; quantity: number }
export interface AnalyticsOrder { id: string; status: string; subtotal: string; discountAmount: string; shippingCharge: string; promoCode: string | null; items: AnalyticsLine[] }
export function commercePayload(lines: AnalyticsLine[], discount = 0, coupon?: string | null) {
  const subtotal = lines.reduce((sum, l) => sum + Number(l.unitPrice) * l.quantity, 0);
  if (!lines.length || !Number.isFinite(subtotal) || subtotal <= 0 || !Number.isFinite(discount) || discount < 0 || discount > subtotal || lines.some(l => !l.productId || !l.productName || !Number.isFinite(Number(l.unitPrice)) || Number(l.unitPrice) <= 0 || !Number.isInteger(l.quantity) || l.quantity < 1)) return null;
  // Allocate discounts in paise; split a line when rounding differs by one paisa.
  let remaining = Math.round(discount * 100);
  const items = lines.flatMap((l, index) => {
    const unit = Math.round(Number(l.unitPrice) * 100);
    const lineDiscount = index === lines.length - 1 ? remaining : Math.min(remaining, Math.round(discount * 100 * (unit / 100 * l.quantity) / subtotal));
    remaining -= lineDiscount;
    const base = Math.floor(lineDiscount / l.quantity), extra = lineDiscount % l.quantity;
    const item = (quantity: number, reduction: number) => ({ item_id: l.productId, item_name: l.productName, item_brand: "The Crunch Era", price: (unit - reduction) / 100, discount: reduction / 100, quantity });
    return [...(l.quantity > extra ? [item(l.quantity - extra, base)] : []), ...(extra ? [item(extra, base + 1)] : [])];
  });
  return { currency: "INR", value: round(subtotal - discount), ...(coupon ? { coupon } : {}), items };
}
export function purchasePayload(order: AnalyticsOrder) {
  if (!order?.id || !["paid", "shipped", "delivered"].includes(order.status)) return null;
  const payload = commercePayload(order.items, Number(order.discountAmount), order.promoCode);
  const shipping = Number(order.shippingCharge);
  const subtotal = order.items.reduce((sum, l) => sum + Number(l.unitPrice) * l.quantity, 0);
  if (!payload || !Number.isFinite(shipping) || shipping < 0 || round(subtotal) !== Number(order.subtotal)) return null;
  return { ...payload, transaction_id: order.id, shipping };
}
export function initAnalytics() {
  if (typeof window === "undefined" || !["thecrunchera.com", "www.thecrunchera.com"].includes(window.location.hostname)) return;
  const w = window as AnalyticsWindow;
  if (w.gtag) return;
  try {
    if (localStorage.getItem("crunch-analytics-disabled") === "1") return;
    w.dataLayer = w.dataLayer || [];
    w.gtag = function () { w.dataLayer!.push(arguments); };
    w.gtag("js", new Date());
    // Enhanced measurement owns initial and History API page views. No manual duplicates.
    w.gtag("config", MEASUREMENT_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    document.head.appendChild(script);
  } catch { /* Analytics must never interrupt shopping. */ }
}
export function trackCommerce(event: string, payload: Record<string, unknown> | null) {
  try {
    if (!payload || typeof window === "undefined" || localStorage.getItem("crunch-analytics-disabled") === "1") return false;
    const gtag = (window as AnalyticsWindow).gtag;
    if (!gtag) return false;
    gtag("event", event, payload);
    return true;
  } catch { return false; }
}
export function trackProduct(event: string, product: { id: string; name: string; price: string }, quantity = 1) {
  trackCommerce(event, commercePayload([{ productId: product.id, productName: product.name, unitPrice: product.price, quantity }]));
}
export function markPurchasePending(id: string) {
  pending.set(id, Date.now());
  try { localStorage.setItem(`crunch-ga-pending:${id}`, String(Date.now())); } catch { /* Memory fallback. */ }
}
export function trackConfirmedPurchase(order: AnalyticsOrder) {
  try {
    const payload = purchasePayload(order);
    if (!payload || sent.has(order.id)) return;
    let started = pending.get(order.id) || 0;
    try {
      if (localStorage.getItem(`crunch-ga-sent:${order.id}`)) return;
      started = Number(localStorage.getItem(`crunch-ga-pending:${order.id}`)) || started;
    } catch { /* Memory fallback. */ }
    // Do not retroactively count historical orders when someone visits their account.
    if (!started || Date.now() - started > 7 * 86400000) return;
    if (!trackCommerce("purchase", payload)) return;
    sent.add(order.id);
    pending.delete(order.id);
    try { localStorage.setItem(`crunch-ga-sent:${order.id}`, "1"); localStorage.removeItem(`crunch-ga-pending:${order.id}`); } catch { /* Memory fallback. */ }
  } catch { /* Malformed analytics data must not affect a confirmed payment. */ }
}
export async function trackPurchaseById(id: string) {
  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(id)}`, { credentials: "include" });
    if (response.ok) trackConfirmedPurchase(await response.json());
  } catch { /* Order page can retry from authoritative data after navigation. */ }
}
