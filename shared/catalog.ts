import type { Product } from "./schema";

// Taste information from the existing catalog; pack size supplied by the owner.
// No certification, health or review claims are inferred from marketing imagery.
const details: Record<string, { flavour: string; description: string; tone: string }> = {
  "ragi chips": { flavour: "Peri Peri", description: "Ragi chips with a spicy Peri Peri twist. A bold, crunchy companion for your next snack break.", tone: "peach" },
  "oats chips": { flavour: "Indian Masala", description: "Crispy oats chips with Indian masala flavour. Open a pack and give your everyday break a little more crunch.", tone: "lilac" },
  "moong dal chips": { flavour: "Indian Masala", description: "Moong dal chips with Indian masala seasoning. Savoury, crunchy and ready for whenever the snack mood strikes.", tone: "mint" },
  "mix veg chips": { flavour: "Indian Masala", description: "Mix veg chips with a classic Indian masala flavour. Bring a different crunch to your snack rotation.", tone: "yellow" },
};
export function productDetails(product: Pick<Product, "name" | "description">) {
  const known = details[product.name.toLowerCase().trim()];
  return { ...known, description: known?.description || product.description, flavour: known?.flavour || "Chips", tone: known?.tone || "lilac", packSize: known ? "60 g" : null };
}
export function publicProduct(product: Product): Product {
  return { ...product, description: productDetails(product).description, badge: null };
}
