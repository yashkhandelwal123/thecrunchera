import { useEffect, useRef } from "react";
import { commercePayload, trackCommerce, trackProduct } from "../lib/analytics";
import type { AnalyticsLine } from "../lib/analytics";
export function useProductView(product?: { id: string; name: string; price: string }) {
  const last = useRef("");
  useEffect(() => {
    if (product && product.id !== last.current) { last.current = product.id; trackProduct("view_item", product); }
  }, [product]);
}
export function useCommerceView(event: "view_cart" | "begin_checkout", quote?: { lineItems: AnalyticsLine[]; discountPaise: number; promoCode: string | null }, ready = true) {
  const sent = useRef(false);
  useEffect(() => {
    if (!sent.current && ready && quote?.lineItems.length) {
      const payload = commercePayload(quote.lineItems, quote.discountPaise / 100, quote.promoCode);
      if (payload) { sent.current = true; trackCommerce(event, payload); }
    }
  }, [event, quote, ready]);
}
