import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";
import { pageMetadata, productForPath, productSchema, SITE_URL, edamameSchema, supplementalSchema } from "@shared/seo";

export default function Seo() {
  const [location] = useLocation();
  const path = location.replace(/\/$/, "") || "/";
  const needsCatalog = path.startsWith("/products/") || path === "/edamame-beans";
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/products"], enabled: needsCatalog });
  const product = productForPath(path, products || []);
  useEffect(() => {
    if (needsCatalog && !products) return;
    const metadata = pageMetadata(path, product);
    document.title = metadata.title;
    const setMeta = (attribute: string, key: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!element) { element = document.createElement("meta"); element.setAttribute(attribute, key); document.head.appendChild(element); }
      element.content = content;
    };
    setMeta("name", "description", metadata.description);
    // Do not mark a valid server-rendered product noindex while its API request loads.
    if (!needsCatalog || products) setMeta("name", "robots", metadata.noindex ? "noindex, follow" : "index, follow");
    setMeta("property", "og:title", metadata.title);
    setMeta("property", "og:description", metadata.description);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", SITE_URL + metadata.path);
    setMeta("property", "og:image", metadata.image);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", metadata.title);
    setMeta("name", "twitter:description", metadata.description);
    setMeta("name", "twitter:image", metadata.image);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = SITE_URL + metadata.path;
    document.getElementById("product-jsonld")?.remove();
    const structured = product ? productSchema(product) : path === "/edamame-beans" ? edamameSchema(products || []) : undefined;
    if (structured) {
      const script = document.createElement("script"); script.id = "product-jsonld"; script.type = "application/ld+json";
      script.textContent = JSON.stringify(structured); document.head.appendChild(script);
    }
    document.getElementById("site-jsonld")?.remove();
    const extra = supplementalSchema(path, product);
    if (extra.length) { const script = document.createElement("script"); script.id = "site-jsonld"; script.type = "application/ld+json"; script.textContent = JSON.stringify(extra); document.head.appendChild(script); }
  }, [path, needsCatalog, product, products]);
  return null;
}
