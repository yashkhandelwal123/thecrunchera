import type { Product } from "./schema";
import { productDetails, productFaqs } from "./catalog";
import { edamame, edamameVariants } from "./edamame";
import { shoppingFaqs } from "./faqs";

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

export const EDAMAME_PATH = "/edamame-beans";
export const isEdamame = (product: Pick<Product, "name">) => /edamame/i.test(product.name);
export const productSlug = (product: Pick<Product, "name">) => product.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "snack";
export function productPath(product: Pick<Product, "id" | "name">) {
  return isEdamame(product) ? EDAMAME_PATH : `/products/${productSlug(product)}`;
}
export function variantPath(product: Pick<Product, "id" | "name">) {
  const variant = edamameVariants.find(v => v.id === product.id);
  return variant ? `${EDAMAME_PATH}?size=${variant.size.replace(/\s/g, '')}` : productPath(product);
}
export function productForPath(path: string, products: Product[]) {
  const id = productIdFromPath(path);
  if (id) return products.find(p => p.id === id);
  const match = /^\/products\/([^/]+)$/.exec(path);
  return match ? products.find(p => productSlug(p) === match[1]) : undefined;
}

export function productIdFromPath(path: string): string | undefined {
  const match = /^\/products\/[^/]+\/([^/]+)$/.exec(path);
  if (!match) return undefined;
  try { return decodeURIComponent(match[1]); } catch { return undefined; }
}

export function productSchema(product: Product) {
  return {
    "@context": "https://schema.org", "@type": "Product",
    name: product.name, description: productDetails(product).description,
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

export function edamameSchema(products: Product[]) {
  const variants = edamameVariants.flatMap(v => {
    const product = products.find(p => p.id === v.id && Number(p.price) > 0);
    return product ? [{ ...productSchema(product), "@context": undefined, size: v.size,
      offers: { ...productSchema(product).offers, url: SITE_URL + variantPath(product) } }] : [];
  });
  if (!variants.length) return undefined;
  return { "@context": "https://schema.org", "@type": "ProductGroup", "@id": SITE_URL + EDAMAME_PATH + "#product",
    name: edamame.name, description: edamame.description, url: SITE_URL + EDAMAME_PATH,
    image: edamame.images.map(i => SITE_URL + i.src), brand: { "@type": "Brand", name: BRAND },
    productGroupID: "crunch-era-edamame", variesBy: ["https://schema.org/size"], hasVariant: variants };
}
export function supplementalSchema(path: string, product?: Product) {
  const faqs = product ? productFaqs(product) : path === EDAMAME_PATH ? productFaqs({ name: edamame.name, description: edamame.description }) : path === "/" ? shoppingFaqs : [];
  return [ ...(path === "/" ? [{ "@context": "https://schema.org", "@type": "Organization", "@id": SITE_URL + "#organization", name: BRAND, url: SITE_URL, logo: SITE_URL + "/brand-logo-olive.jpeg" }] : []),
    ...(faqs.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(f => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) }] : []) ];
}
