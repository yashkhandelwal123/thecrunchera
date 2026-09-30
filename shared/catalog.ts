import type { Product } from "./schema";

// Ingredients and product facts supplied by the owner from their Amazon listings.
// No certification, health or review claims are inferred from marketing imagery.
const details: Record<string, { flavour: string; description: string; tone: string; ingredients?: string; shelfLife?: string; metaDescription?: string }> = {
  "ragi chips": { flavour: "Peri Peri", description: "Ragi chips with a bold, spicy and tangy Peri Peri seasoning. Made with ragi flour, urad dal flour and tapioca starch, and cooked in rice bran oil for a satisfying crunch. Take a 60 g pack along for an office break, a journey or an evening snack.", tone: "peach", ingredients: "Ragi Flour, Urad Dal Flour, Tapioca (Sabudana) Starch, Rice Bran Oil, Himalayan Pink Salt, Spices and Condiments.", metaDescription: "Shop Peri Peri Ragi Chips in a 60 g pack. Made with ragi, urad dal and tapioca starch, cooked in rice bran oil. Explore ingredients and order online." },
  "oats chips": { flavour: "Indian Masala", description: "Crispy oats chips with Indian masala flavour, made with 76% oats, urad dal and tapioca starch. Cooked in rice bran oil and seasoned with Himalayan pink salt and spices. Enjoy a 60 g pack whenever you feel like a savoury snack.", tone: "lilac", ingredients: "Oats Flour, Urad Dal Flour, Tapioca Starch, Rice Bran Oil, Himalayan Pink Salt, Spices & Condiments.", metaDescription: "Shop Oats Chips with Indian masala flavour in a 60 g pack. Made with 76% oats and cooked in rice bran oil. View ingredients and order online.", shelfLife: "6 months. Check the pack for the manufacture and best-before dates." },
  "moong dal chips": { flavour: "Indian Masala", description: "Light, crunchy moong dal chips with Indian masala seasoning. Made with 76% moong dal, blended with urad dal and tapioca starch, and cooked in rice bran oil. Open a 60 g pack for a savoury crunch at tea time or between everyday plans.", tone: "mint", ingredients: "Moong Dal Flour, Urad Dal Flour, Tapioca Starch, Rice Bran Oil, Himalayan Pink Salt, Spices & Condiments.", metaDescription: "Shop Moong Dal Chips in a 60 g pack. Made with 76% moong dal, Indian masala seasoning and rice bran oil. Explore ingredients and order online.", shelfLife: "6 months. Check the pack for the manufacture and best-before dates." },
  "mix veg chips": { flavour: "Indian Masala", description: "Discover the crunch of beetroot, palak (spinach) and carrot with our Indian masala Mix Veg Chips. Made without maida or palm oil, this savoury mix brings variety to your snack break. Enjoy a 60 g pack at tea time, at your desk or on the go.", tone: "yellow", ingredients: "Beetroot, Spinach, Carrot, Urad Dal Flour, Tapioca Starch, Rice Bran Oil, Himalayan Pink Salt, Spices & Condiments.", metaDescription: "Shop Mix Veg Chips made with beetroot, palak and carrot. Indian masala flavour in a 60 g pack, with no maida or palm oil. Order from The Crunch Era." },
};
// Owner confirmed on 2026-09-30 that this label panel applies to all four
// current chips. Net pack weight is 60 g; publish only the label's per-100-g
// values, not its outdated 70-g serving or RDA percentages.
const nutritionPer100g = [
  { name: "Energy", value: "452 kcal" },
  { name: "Protein", value: "11.2 g" },
  { name: "Carbohydrates", value: "70.1 g" },
  { name: "Total sugars", value: "4.5 g" },
  { name: "Added sugar", value: "0 g" },
  { name: "Dietary fibre", value: "10.5 g" },
  { name: "Total fat", value: "16.2 g" },
  { name: "Saturated fat", value: "4.0 g" },
  { name: "Trans fat", value: "0 g" },
  { name: "Cholesterol", value: "0 mg" },
  { name: "Sodium", value: "595 mg" },
];
const allergenAdvice = "This product is packaged in a facility that handles soybeans, mustard, sesame, peanuts, and tree nuts.";
export function productDetails(product: Pick<Product, "name" | "description">) {
  const known = details[product.name.toLowerCase().trim()];
  return { ...known, description: known?.description || product.description, flavour: known?.flavour || "Chips", tone: known?.tone || "lilac", packSize: known ? "60 g" : null, nutrition: known ? nutritionPer100g : undefined, allergenAdvice: known ? allergenAdvice : undefined };
}
export function publicProduct(product: Product): Product {
  return { ...product, description: productDetails(product).description, badge: null };
}

export const productLabelNotice = "Packaging information may change. Always read the ingredients, allergen advice, warnings and directions on the pack before consuming.";
