import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import BlogContent from "../shared/BlogContent";
import { articleForPath } from "../shared/blog";
import { shoppingFaqs } from "../shared/faqs";
import { edamame, edamameVariants } from "../shared/edamame";
import type { Express, Request, Response } from "express";
import { publicProduct, productDetails, productLabelNotice, productFaqs } from "../shared/catalog";
import { storage } from "./storage";
import type { Product } from "../shared/schema";
import { pageMetadata, productIdFromPath, productPath, productSchema, publicPages, SITE_URL, productForPath, variantPath, edamameSchema, supplementalSchema, isEdamame } from "../shared/seo";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export function registerSeoRoutes(app: Express) {
  app.get("/robots.txt", (_req, res) => {
    // Private pages must remain crawlable for their noindex directive to be seen.
    res.type("text/plain").send(`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  });
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const products = await storage.getAllProducts();
      const paths = Array.from(new Set([...Object.keys(publicPages), ...products.map(productPath)]));
      res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>${escapeHtml(SITE_URL + path)}</loc></url>`).join("")}</urlset>`);
    } catch (error) {
      console.error("Unable to generate sitemap", error);
      res.status(503).set("Retry-After", "60").type("text/plain").send("Sitemap temporarily unavailable");
    }
  });
}

export function renderSeoHtml(template: string, path: string, product?: Product, products: Product[] = []) {
  const metadata = pageMetadata(path, product);
  const meta = (attribute: string, key: string, value: string) => `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`;
  // Replace existing tags so crawlers do not encounter duplicate or conflicting metadata.
  let html = template.replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\b[^>]*(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi, "")
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, "");
  const tags = [
    `<title>${escapeHtml(metadata.title)}</title>`,
    meta("name", "description", metadata.description),
    meta("name", "robots", metadata.noindex ? "noindex, follow" : "index, follow"),
    `<link rel="canonical" href="${escapeHtml(SITE_URL + metadata.path)}" />`,
    meta("property", "og:title", metadata.title), meta("property", "og:description", metadata.description),
    meta("property", "og:type", articleForPath(path) ? "article" : "website"), meta("property", "og:url", SITE_URL + metadata.path),
    meta("property", "og:image", metadata.image), meta("name", "twitter:card", "summary_large_image"),
    meta("name", "twitter:title", metadata.title), meta("name", "twitter:description", metadata.description), meta("name", "twitter:image", metadata.image),
  ];
  if (product) tags.push(`<script id="product-jsonld" type="application/ld+json">${JSON.stringify(productSchema(product)).replace(/</g, "\\u003c")}</script>`);
  if (path === "/edamame-beans") {
    const group = edamameSchema(products);
    if (group) tags.push(`<script id="product-jsonld" type="application/ld+json">${JSON.stringify(group).replace(/</g, "\\u003c")}</script>`);
  }
  const extra = supplementalSchema(path, product);
  if (extra.length) tags.push(`<script id="site-jsonld" type="application/ld+json">${JSON.stringify(extra).replace(/</g, "\\u003c")}</script>`);
  html = html.replace("</head>", tags.join("\n") + "\n</head>");
  // React's existing createRoot replaces this crawlable initial content on mount.
  // It uses the same catalog data as the browser, with no separate bot response.
  const faqHtml = (faqs: { question: string; answer: string }[]) => `<section><h2>Frequently asked questions</h2>${faqs.map(f => `<h3>${escapeHtml(f.question)}</h3><p>${escapeHtml(f.answer)}</p>`).join("")}</section>`;
  let content = "";
  if (path === "/blog" || articleForPath(path)) {
    content = renderToStaticMarkup(createElement(BlogContent, { article: articleForPath(path) }));
  } else if (product) {
    const detail = productDetails(product);
    const facts = `<h2>Pack details</h2><p>${escapeHtml(detail.flavour)}${detail.packSize ? ` · ${escapeHtml(detail.packSize)}` : ""}</p>${detail.ingredients ? `<h2>Ingredients</h2><p>${escapeHtml(detail.ingredients)}</p>` : ""}${detail.shelfLife ? `<h2>Shelf life</h2><p>${escapeHtml(detail.shelfLife)}</p>` : ""}${detail.allergenAdvice ? `<h2>Allergen advice</h2><p>${escapeHtml(detail.allergenAdvice)}</p>` : ""}${detail.nutrition ? `<table><caption>Nutritional information · per 100 g</caption><thead><tr><th scope="col">Nutrient</th><th scope="col">Per 100 g</th></tr></thead><tbody>${detail.nutrition.map(row => `<tr><th scope="row">${escapeHtml(row.name)}</th><td>${escapeHtml(row.value)}</td></tr>`).join("")}</tbody></table>` : ""}<p>${escapeHtml(productLabelNotice)}</p>`;
    content = `<main><nav><a href="/">Home</a> / <a href="/products">Snacks</a></nav><h1>${escapeHtml(product.name)}</h1><img src="${escapeHtml(metadata.image)}" alt="${escapeHtml(product.name)}" width="480" height="480"><p>${escapeHtml(product.description)}</p><p>₹${escapeHtml(product.price)}</p>${facts}${faqHtml(productFaqs(product))}<a href="/products">Browse all snacks</a></main>`;
  } else if (path === "/edamame-beans") {
    content = `<main><h1>${escapeHtml(edamame.name)}</h1><img src="${edamame.images[0].src}" alt="${escapeHtml(edamame.name)}" width="568" height="568"><p>${escapeHtml(edamame.description)}</p><p>Available sizes: ${edamameVariants.map(v => escapeHtml(v.size)).join(", ")}</p><h2>Ingredients</h2><p>${escapeHtml(edamame.ingredients)}</p><p>${escapeHtml(edamame.allergenAdvice)}</p><h2>Nutrition per 100 g</h2><ul>${edamame.nutrition.map(row => `<li>${escapeHtml(row.name)}: ${escapeHtml(row.value)}</li>`).join("")}</ul><p>Manufacturer, packer and importer: ${escapeHtml(edamame.manufacturer)}. Country of origin: ${escapeHtml(edamame.origin)}.</p>${products.filter(isEdamame).map(p => `<p><a href="${variantPath(p)}">${escapeHtml(p.name)}</a> · ₹${escapeHtml(p.price)}</p>`).join("")}${faqHtml(productFaqs({ name: edamame.name, description: edamame.description }))}<a href="/contact">Ask about ingredients or delivery</a></main>`;
  } else if (path === "/" || path === "/products") {
    content = `<main><h1>${path === "/" ? "Chips & Roasted Edamame Beans" : "Shop Snacks Online"}</h1><p>${escapeHtml(metadata.description)}</p><ul>${products.filter((item, i, all) => all.findIndex(p => productPath(p) === productPath(item)) === i).map(item => `<li><a href="${escapeHtml(productPath(item))}">${escapeHtml(item.name)}</a><p>${escapeHtml(item.description)}</p><p>₹${escapeHtml(item.price)}</p></li>`).join("")}</ul>${path === "/" ? faqHtml(shoppingFaqs) : ""}<a href="/blog">Read our snack guides</a></main>`;
  }
  return html.replace('<div id="root"></div>', `<div id="root">${content}</div>`);
}

export async function sendSeoHtml(req: Request, res: Response, template: string) {
  const path = req.path.replace(/\/$/, "") || "/";
  const id = productIdFromPath(path);
  let product: Product | undefined;
  let products: Product[] = [];
  try {
    if (id || path.startsWith("/products/") || ["/", "/products", "/edamame-beans"].includes(path)) {
      products = (await storage.getAllProducts()).map(publicProduct);
      if (id || path.startsWith("/products/")) product = productForPath(path, products);
    }
  } catch (error) {
    console.error("Unable to load SEO catalog", error);
    res.status(503).set("Retry-After", "60").type("text/plain").send("Store temporarily unavailable. Please try again shortly.");
    return;
  }
  if (product && path !== productPath(product)) {
    res.redirect(301, variantPath(product));
    return;
  }
  const privateRoute = /^\/(cart|checkout|orders(?:\/[^/]+)?|admin\/(?:orders|growth)|manufacturing-details)$/.test(path);
  const status = publicPages[path] || product || privateRoute ? 200 : 404;
  // Avoid caching catalog prices or accidental private-route responses at a CDN.
  res.status(status).set("Cache-Control", "no-cache").type("html").send(renderSeoHtml(template, path, product, products));
}
