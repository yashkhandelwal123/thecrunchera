import { test } from "node:test";
import assert from "node:assert/strict";
import { calculatePricing, toPaise } from "../shared/pricing";
import { quoteCart } from "./pricing";
import { checkoutSchema } from "../shared/schema";
import express from "express";
import { once } from "node:events";
import { registerRoutes } from "./routes";
import { storage } from "./storage";

test("shipping boundaries use original subtotal; coupon threshold is strictly above 450", () => {
  assert.equal(calculatePricing(35899).shippingPaise, 7000);
  assert.equal(calculatePricing(35900).shippingPaise, 0);
  assert.equal(calculatePricing(45000, "CRUNCH10").discountPaise, 0);
  assert.match(calculatePricing(45000, "CRUNCH10").promoError!, /above/);
  const eligible = calculatePricing(45001, " crunch10 ");
  assert.equal(eligible.discountPaise, 4500);
  assert.equal(eligible.shippingPaise, 0);
  assert.equal(eligible.totalPaise, 40501);
  assert.equal(calculatePricing(49000, "CRUNCH10").totalPaise, 44100);
  assert.equal(calculatePricing(7000).totalPaise, 14000);
  assert.equal(calculatePricing(0).shippingPaise, 0);
  assert.ok(calculatePricing(49000, "FAKE").promoError);
});

test("currency math preserves paise and rejects invalid catalog prices", () => {
  assert.equal(toPaise("70.10"), 7010);
  assert.equal(toPaise("70"), 7000);
  assert.equal(calculatePricing(45005, "CRUNCH10").discountPaise, 4501);
  for (const price of ["-5", "NaN", "1.999", "0", "Infinity"]) assert.throws(() => toPaise(price));
});

test("quote uses catalog prices, combines duplicates, rejects missing products and abusive quantities", async () => {
  const product = (await storage.getAllProducts())[0];
  const quote = await quoteCart(storage, [{ productId: product.id, quantity: 3 }, { productId: product.id, quantity: 4 }], "CRUNCH10");
  assert.equal(quote.lineItems.length, 1);
  assert.equal(quote.lineItems[0].quantity, 7);
  assert.equal(quote.subtotalPaise, 49000);
  for (const quantity of [-1, 0, 1.5, 100]) await assert.rejects(quoteCart(storage, [{ productId: product.id, quantity }]));
  await assert.rejects(quoteCart(storage, [{ productId: "missing", quantity: 1 }]));
  await assert.rejects(quoteCart(storage, [{ productId: product.id, quantity: 99 }, { productId: product.id, quantity: 1 }]));
});

test("HTTP quote and order totals agree; rejected promos and changed totals never create orders", async () => {
  const app = express(); app.use(express.json());
  // Test-only session fixture, never imported by the production entrypoint.
  app.use((req, _res, next) => { req.session = { userId: req.headers["x-test-user"] === "qa" ? "qa-user" : undefined } as typeof req.session; next(); });
  const server = await registerRoutes(app); server.listen(0, "127.0.0.1"); await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const product = (await storage.getAllProducts())[0];
  const post = (path: string, body: unknown, signedIn = false) => fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json", ...(signedIn ? { "x-test-user": "qa" } : {}) }, body: JSON.stringify(body) });
  const address = { shippingName: "QA Shopper", shippingPhone: "9999999999", shippingAddressLine1: "Test address only", shippingCity: "Jaipur", shippingState: "Rajasthan", shippingPincode: "302001" };
  try {
    const items = [{ productId: product.id, quantity: 7, price: "0.01" }];
    const response = await post("/api/checkout/quote", { items, promoCode: "crunch10", total: 1 });
    assert.equal(response.status, 200); const quote = await response.json();
    assert.equal(quote.totalPaise, 44100); assert.equal(quote.discountPaise, 4900);
    const payload = { ...address, items, promoCode: "CRUNCH10", expectedTotalPaise: quote.totalPaise, total: "0.01" };
    assert.equal((await post("/api/orders", payload)).status, 401);
    assert.equal((await post("/api/orders", { ...payload, expectedTotalPaise: 1 }, true)).status, 409);
    assert.equal((await post("/api/orders", { ...payload, promoCode: "INVALID" }, true)).status, 400);
    assert.equal((await storage.getOrdersByUserId("qa-user")).length, 0);
    const created = await post("/api/orders", payload, true); assert.equal(created.status, 201);
    const order = await created.json();
    assert.equal(order.subtotal, "490.00"); assert.equal(order.discountAmount, "49.00"); assert.equal(order.shippingCharge, "0.00"); assert.equal(order.total, "441.00"); assert.equal(order.promoCode, "CRUNCH10");
    assert.equal((await storage.getOrderItems(order.id))[0].quantity, 7);
    const one = await post("/api/orders", { ...address, items: [{ productId: product.id, quantity: 1 }], expectedTotalPaise: 14000 }, true);
    assert.equal(one.status, 201); const smallOrder = await one.json(); assert.equal(smallOrder.shippingCharge, "70.00"); assert.equal(smallOrder.total, "140.00");
    const invalidPhone = checkoutSchema.safeParse({ ...payload, shippingPhone: "12" }); assert.equal(invalidPhone.success, false);
    const invalidPin = checkoutSchema.safeParse({ ...payload, shippingPincode: "123" }); assert.equal(invalidPin.success, false);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
