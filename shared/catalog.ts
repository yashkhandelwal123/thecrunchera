import type { Product } from "./schema";

// Ingredients and product facts supplied by the owner from their Amazon listings.
// No certification, health or review claims are inferred from marketing imagery.
const details: Record<string, { flavour: string; description: string; tone: string; ingredients?: string; shelfLife?: string; metaDescription?: string }> = {
  "ragi chips": { flavour: "Peri Peri", description: "Ragi chips with a bold, spicy and tangy Peri Peri seasoning. Made with ragi flour, urad dal flour and tapioca starch, and cooked in rice bran oil for a satisfying crunch. Take a 60 g pack along for an office break, a journey or an evening snack.", tone: "peach", ingredients: "Ragi Flour, Urad Dal Flour, Tapioca (Sabudana) Starch, Rice Bran Oil, Himalayan Pink Salt, Spices and Condiments.", metaDescription: "Shop Peri Peri Ragi Chips in a 60 g pack. Made with ragi, urad dal and tapioca starch, cooked in rice bran oil. Explore ingredients and order online." },
  "oats chips": { flavour: "Indian Masala", description: "Crispy oats chips with Indian masala flavour, made with 76% oats, urad dal and tapioca starch. Cooked in rice bran oil and seasoned with Himalayan pink salt and spices. Enjoy a 60 g pack whenever you feel like a savoury snack.", tone: "lilac", ingredients: "Oats Flour, Urad Dal Flour, Tapioca Starch, Rice Bran Oil, Himalayan Pink Salt, Spices & Condiments.", metaDescription: "Shop Oats Chips with Indian masala flavour in a 60 g pack. Made with 76% oats and cooked in rice bran oil. View ingredients and order online.", shelfLife: "6 months. Check the pack for the manufacture and best-before dates." },
  "moong dal chips": { flavour: "Indian Masala", description: "Light, crunchy moong dal chips with Indian masala seasoning. Made with 76% moong dal, blended with urad dal and tapioca starch, and cooked in rice bran oil. Open a 60 g pack for a savoury crunch at tea time or between everyday plans.", tone: "mint", ingredients: "Moong Dal Flour, Urad Dal Flour, Tapioca Starch, Rice Bran Oil, Himalayan Pink Salt, Spices & Condiments.", metaDescription: "Shop Moong Dal Chips in a 60 g pack. Made with 76% moong dal, Indian masala seasoning and rice bran oil. Explore ingredients and order online.", shelfLife: "6 months. Check the pack for the manufacture and best-before dates." },
  "mix veg chips": { flavour: "Indian Masala", description: "Mix veg chips with a classic Indian masala flavour. Bring a different crunch to your snack rotation.", tone: "yellow" },
};
export function productDetails(product: Pick<Product, "name" | "description">) {
  const known = details[product.name.toLowerCase().trim()];
  return { ...known, description: known?.description || product.description, flavour: known?.flavour || "Chips", tone: known?.tone || "lilac", packSize: known ? "60 g" : null };
}
export function publicProduct(product: Product): Product {
  return { ...product, description: productDetails(product).description, badge: null };
}

export const productLabelNotice = "Packaging information may change. Always read the ingredients, allergen advice, warnings and directions on the pack before consuming.";
