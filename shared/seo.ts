import type { Product } from "./schema";

export const SITE_URL = "https://thecrunchera.com";
export const BRAND = "The Crunchera Bites";
export const publicPages: Record<string, { title: string; description: string }> = {
  "/": { title: `Buy Ragi, Oats & Moong Dal Chips Online | ${BRAND}`, description: "Shop ragi, oats, moong dal and mix veg chips from The Crunchera Bites. Explore our flavours, compare prices and order your favourite snacks online." },
  "/products": { title: `Shop Chips Online | ${BRAND}`, description: "Browse ragi, oats, moong dal and mix veg chips. Discover your favourite Crunchera snacks and order online." },
  "/about": { title: `About Us | ${BRAND}`, description: "Discover The Crunchera Bites and the story behind our range of crunchy snacks." },
  "/contact": { title: `Contact Us | ${BRAND}`, description: "Contact The Crunchera Bites with product questions, order enquiries and feedback." },
  "/privacy-policy": { title: `Privacy Policy | ${BRAND}`, description: "Read how The Crunchera Bites handles your personal information." },
  "/terms-of-service": { title: `Terms of Service | ${BRAND}`, description: "Read the terms for shopping with The Crunchera Bites." },
};

export function productPath(product: Pick<Product, "id" | "name">) {
  const slug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "snack";
  return `/products/${slug}/${encodeURIComponent(product.id)}`;
}

export function productIdFromPath(path: string): string | undefined {
  const match = /^\/products\/[^/]+\/([^/]+)$/.exec(path);
  if (!match) return undefined;
  try { return decodeURIComponent(match[1]); } catch { return undefined; }
}

export function productSchema(product: Product) {
  return {
    "@context": "https://schema.org", "@type": "Product",
    name: product.name, description: product.description,
    image: new URL(product.image, SITE_URL).href,
    sku: product.id, brand: { "@type": "Brand", name: BRAND },
    offers: { "@type": "Offer", url: SITE_URL + productPath(product), priceCurrency: "INR", price: product.price },
  };
}

export function pageMetadata(path: string, product?: Product) {
  if (product) return { title: `Buy ${product.name} Online | ${BRAND}`, description: product.description, path: productPath(product), noindex: false, image: new URL(product.image, SITE_URL).href };
  const page = publicPages[path];
  return { title: page?.title || `The Crunchera Bites`, description: page?.description || "Shop and manage your orders at The Crunchera Bites.", path, noindex: !page, image: SITE_URL + "/product-images/ragi_chips.webp" };
}
