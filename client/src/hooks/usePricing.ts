import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/contexts/CartContext";
import type { PricingQuote } from "@shared/pricing";
import { BASE_URL } from "@/ENDPOINTS";
export type CartQuote = PricingQuote & { lineItems: { productId: string; productName: string; productImage: string; unitPrice: string; quantity: number }[] };
export function usePricing() {
  const { cart, promoCode } = useCart();
  const items = cart.items.map(item => ({ productId: item.product.id, quantity: item.quantity }));
  return useQuery<CartQuote>({
    queryKey: ["checkout-quote", items, promoCode], enabled: items.length > 0,
    staleTime: 0, refetchOnWindowFocus: true, retry: 1,
    queryFn: async ({ signal }) => {
      const response = await fetch(`${BASE_URL}/api/checkout/quote`, { method: "POST", credentials: "include", signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, promoCode }) });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Couldn't check your cart. Please try again.");
      return data;
    },
  });
}
