import type { Product } from "./schema";
import { productDetails } from "./catalog";

export const SITE_URL = "https://thecrunchera.com";
export const BRAND = "The Crunch Era";
export const publicPages: Record<string, { title: string; description: string }> = {
  "/": { title: `Chips & Roasted Edamame Beans | ${BRAND}`, description: "Shop ragi, oats, moong dal and mix veg chips from The Crunch Era. Discover Classic Salt roasted edamame beans alongside your favourite chips." },
  "/products": { title: `Shop Chips & Roasted Edamame | ${BRAND}`, description: "Browse ragi, oats, moong dal and mix veg chips. Explore our Classic Salt roasted edamame beans, too." },
  "/edamame-beans": { title: `Roasted Edamame Beans, Classic Salt | ${BRAND}`, description: "Discover The Crunch Era roasted and salted edamame beans. View ingredients, soy allergen advice and nutrition: 46.3 g protein per 100 g." },
  "/shipping": { title: `Shipping & Offers | ${BRAND}`, description: "View delivery charges, free shipping eligibility and CRUNCH10 terms before shopping The Crunch Era chips." },
  "/about": { title: `About Us | ${BRAND}`, description: "Discover The Crunch Era and the story behind our range of crunchy snacks." },
  "/contact": { title: `Contact Us | ${BRAND}`, description: "Contact The Crunch Era with product questions, order enquiries and feedback." },
  "/privacy-policy": { title: `Privacy Policy | ${BRAND}`, description: "Read how The Crunch Era handles your personal information." },
  "/terms-of-service": { title: `Terms of Service | ${BRAND}`, description: "Read the terms for shopping with The Crunch Era." },
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
  if (product) return { title: `Buy ${product.name} Online | ${BRAND}`, description: productDetails(product).metaDescription || product.description, path: productPath(product), noindex: false, image: new URL(product.image, SITE_URL).href };
  const page = publicPages[path];
  return { title: page?.title || `The Crunch Era`, description: page?.description || "Shop and manage your orders at The Crunch Era.", path, noindex: !page, image: SITE_URL + (path === "/edamame-beans" ? "/product-images/edamame-front.jpg" : "/product-images/ragi_chips.webp") };
}
