import type { IStorage } from "./storage";
import type { InsertOrderItem } from "../shared/schema";
import { calculatePricing, MAX_ITEM_QUANTITY, toPaise } from "../shared/pricing";

export class PricingError extends Error {}
export async function quoteCart(storage: Pick<IStorage, "getProductById">, items: { productId: string; quantity: number }[], code = "") {
  const quantities = new Map<string, number>();
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_ITEM_QUANTITY) throw new PricingError("Choose between 1 and 99 packs per product.");
    const quantity = (quantities.get(item.productId) || 0) + item.quantity;
    if (quantity > MAX_ITEM_QUANTITY) throw new PricingError("Choose no more than 99 packs per product.");
    quantities.set(item.productId, quantity);
  }
  if (!quantities.size || quantities.size > 50) throw new PricingError("Please check the items in your cart.");
  const lineItems: Omit<InsertOrderItem, "orderId">[] = [];
  let subtotal = 0;
  for (const [id, quantity] of Array.from(quantities)) {
    const product = await storage.getProductById(id);
    if (!product) throw new PricingError("A product in your cart is no longer available. Remove it and try again.");
    subtotal += toPaise(product.price) * quantity;
    lineItems.push({ productId: id, productName: product.name, productImage: product.image, unitPrice: product.price, quantity });
  }
  return { ...calculatePricing(subtotal, code), lineItems };
}
