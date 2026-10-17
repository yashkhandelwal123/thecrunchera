import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";
import { pageMetadata, productIdFromPath, productSchema, SITE_URL } from "@shared/seo";

export default function Seo() {
  const [location] = useLocation();
  const path = location.replace(/\/$/, "") || "/";
  const id = productIdFromPath(path);
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/products"], enabled: !!id });
  const product = products?.find((item) => item.id === id);
  useEffect(() => {
    if (id && !products) return;
    const metadata = pageMetadata(path, product);
    document.title = metadata.title;
    const setMeta = (attribute: string, key: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!element) { element = document.createElement("meta"); element.setAttribute(attribute, key); document.head.appendChild(element); }
      element.content = content;
    };
    setMeta("name", "description", metadata.description);
    // Do not mark a valid server-rendered product noindex while its API request loads.
    if (!id || products) setMeta("name", "robots", metadata.noindex ? "noindex, follow" : "index, follow");
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
    if (product) {
      const script = document.createElement("script"); script.id = "product-jsonld"; script.type = "application/ld+json";
      script.textContent = JSON.stringify(productSchema(product)); document.head.appendChild(script);
    }
  }, [path, id, product, products]);
  return null;
}
