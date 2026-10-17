import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import { once } from "node:events";
import { registerSeoRoutes, renderSeoHtml, sendSeoHtml } from "./seo";
import { storage } from "./storage";
import { productPath, SITE_URL } from "../shared/seo";

const template = '<html><head><title>Old title</title><meta name="description" content="old"></head><body><div id="root"></div></body></html>';

test("HTML escapes catalog values and keeps JSON-LD valid", async () => {
  const original = (await storage.getAllProducts())[0];
  const product = { ...original, name: 'Ragi <Chips> & "More"', description: '</script><script>alert(1)</script>' };
  const html = renderSeoHtml(template, productPath(product), product);
  assert.equal((html.match(/<title>/g) || []).length, 1);
  assert.equal((html.match(/name="description"/g) || []).length, 1);
  assert.ok(html.includes("Ragi &lt;Chips&gt; &amp; &quot;More&quot;"));
  assert.ok(!html.includes(product.description));
  const json = html.match(/<script id="product-jsonld" type="application\/ld\+json">([\s\S]*?)<\/script>/)![1];
  assert.equal(JSON.parse(json).description, product.description);
  assert.equal(JSON.parse(json).offers.price, product.price);
});

test("HTTP sitemap, initial product HTML, redirects, 404s and noindex", async () => {
  const app = express();
  registerSeoRoutes(app);
  app.get("*", async (req, res) => { await sendSeoHtml(req, res, template); });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const products = await storage.getAllProducts();
    const product = products[0];
    const sitemap = await fetch(base + "/sitemap.xml");
    assert.equal(sitemap.status, 200);
    const xml = await sitemap.text();
    assert.ok(xml.includes(SITE_URL + productPath(product)));
    assert.ok(!xml.includes("/faq"));
    assert.ok(!xml.includes("<lastmod>"));
    assert.ok(!xml.includes("/checkout"));
    assert.ok((await (await fetch(base + "/robots.txt")).text()).includes(SITE_URL + "/sitemap.xml"));
    for (const path of ["/", "/products", productPath(product)]) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes(product.name));
      assert.ok(html.includes('content="index, follow"'));
    }
    const redirect = await fetch(base + `/products/old-name/${product.id}`, { redirect: "manual" });
    assert.equal(redirect.status, 301);
    assert.equal(redirect.headers.get("location"), productPath(product));
    for (const path of ["/unknown", "/products/missing/invalid"]) {
      const response = await fetch(base + path);
      assert.equal(response.status, 404);
      assert.ok((await response.text()).includes('content="noindex, follow"'));
    }
    for (const path of ["/cart", "/checkout", "/orders", "/orders/example", "/admin/orders", "/manufacturing-details"]) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200);
      assert.ok((await response.text()).includes('content="noindex, follow"'));
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
