import { useState, useEffect, ReactNode } from "react";
import { useCart } from "@/contexts/CartContext";
import { usePricing } from "@/hooks/usePricing";
import { FREE_SHIPPING_FROM_PAISE, money } from "@shared/pricing";
import { Link } from "wouter";
export default function OrderSummary({ children }: { children?: ReactNode }) {
  const { promoCode, setPromoCode } = useCart();
  const [input, setInput] = useState(promoCode);
  const { data: quote, isFetching, isError, error, refetch } = usePricing();
  useEffect(() => { setInput(promoCode); }, [promoCode]);
  return <aside className="summary-card" aria-label="Order summary">
    <h2>Your bag, all added up.</h2>
    {quote && <div className="shipping-progress">{quote.shippingPaise === 0 ? "Your bag qualifies for free delivery." : `You're ${money(FREE_SHIPPING_FROM_PAISE - quote.subtotalPaise)} away from free delivery.`}<progress aria-label="Progress to free shipping" value={Math.min(quote.subtotalPaise, FREE_SHIPPING_FROM_PAISE)} max={FREE_SHIPPING_FROM_PAISE} /></div>}
    <div className="summary-lines" aria-live="polite" aria-busy={isFetching}>
      {isError ? <p className="inline-error">{error.message} <button type="button" onClick={() => refetch()} className="underline">Retry</button></p> : !quote ? <p>Checking prices and delivery…</p> : <>
        <div><span>Product subtotal</span><span data-testid="subtotal">{money(quote.subtotalPaise)}</span></div>
        <div><span>Shipping</span><span data-testid="shipping">{quote.shippingPaise ? money(quote.shippingPaise) : "Free"}</span></div>
        <div className={quote.discountPaise ? "saving" : ""}><span>Discount {quote.promoCode && `(${quote.promoCode})`}</span><span data-testid="discount">{quote.discountPaise ? "−" : ""}{money(quote.discountPaise)}</span></div>
        <div><span>Additional taxes / fees</span><span>{money(quote.additionalChargesPaise)}</span></div>
        <div className="summary-total"><span>Total</span><span data-testid="total">{money(quote.totalPaise)}</span></div>
        {quote.discountPaise > 0 && <div className="saving"><span>You save on products</span><strong>{money(quote.discountPaise)}</strong></div>}
        {isFetching && <p className="summary-note">Updating your total…</p>}
      </>}
    </div>
    <div className="promo-field"><label htmlFor="promo-code">Have a promo code?</label><div><input id="promo-code" value={input} maxLength={40} autoComplete="off" spellCheck={false} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); setPromoCode(input.trim().toUpperCase()); } }} placeholder="Enter code" aria-describedby="promo-message" /><button type="button" onClick={() => { const code = input.trim().toUpperCase(); setPromoCode(code); if (code === promoCode) void refetch(); }} disabled={isFetching || !input.trim()}>Apply</button></div><div id="promo-message" role="status" className={`promo-status ${quote?.promoError ? "promo-error" : ""}`}>{!isFetching && quote?.promoError ? quote.promoError : !isFetching && quote?.promoCode ? `${quote.promoCode} applied. You save ${money(quote.discountPaise)}.` : "CRUNCH10 gives 10% off products above ₹450."}</div>{promoCode && <button type="button" className="text-link mt-3" onClick={() => { setPromoCode(""); setInput(""); }}>Remove code</button>}</div>
    <div className="mt-6">{children}</div>
    <p className="summary-note">Shipping is based on the product subtotal before discounts. No additional checkout taxes or fees are added. <Link href="/shipping" className="underline">Shipping & offer terms</Link></p>
  </aside>;
}
