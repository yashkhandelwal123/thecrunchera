import { saveShippingPlan } from "./shippingPlanStore";
import { shippingFingerprint } from "./shippingQuotes";
import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { customerShipmentEmail } from "./customerShipmentEmail";
import { storage } from "./storage";
import { registerRoutes } from "./routes";
import type { Order } from "../shared/schema";

const address = { shippingName: "QA <Shopper>", shippingPhone: "9999999999", shippingAddressLine1: "Test address", shippingCity: "Jaipur", shippingState: "Rajasthan", shippingPincode: "302001" };

test("tracking template requires assignment, safely displays carrier and AWB, and makes no pickup/ETA claim", () => {
  const order = { ...address, id: "hidden-order-id", shiprocketShipmentId: "shipment", awbCode: 'AWB/123', courierName: "QA & Courier", trackingUrl: "javascript:alert(1)" } as Order;
  const email = customerShipmentEmail(order);
  assert.ok(email.text.includes("AWB/123"));
  assert.ok(email.html.includes("QA &amp; Courier"));
  assert.ok(email.html.includes("QA &lt;Shopper&gt;"));
  assert.ok(email.html.includes("https://shiprocket.co/tracking/AWB%2F123"));
  assert.ok(!email.html.includes("javascript:"));
  assert.ok(!email.text.includes(order.id));
  assert.ok(email.text.includes("does not confirm pickup"));
  assert.throws(() => customerShipmentEmail({ ...order, awbCode: null }), /required/);
});

test("courier route sends to buyer only after successful assignment; repeat and failed assignments send nothing; mail failure preserves shipment", async () => {
  const saved = { ...process.env };
  Object.assign(process.env, { RESEND_API_KEY: "re_mock", ADMIN_EMAILS: "qa-admin@example.test", SHIPROCKET_EMAIL: "qa@example.test", SHIPROCKET_PASSWORD: "mock-only", ADMIN_EMAIL: "qa-admin@example.test", ADMIN_NOTIFICATION_EMAILS: "khandelwalshubham5775@gmail.com" });
  const admin = await storage.createUser({ googleId: "qa-shipping-admin", email: "qa-admin@example.test", name: "QA admin" });
  const buyer = await storage.createUser({ googleId: "qa-shipping-buyer", email: "qa-buyer@example.test", name: "QA buyer" });
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { req.session = { userId: admin.id } as typeof req.session; next(); });
  const server = await registerRoutes(app); server.listen(0, "127.0.0.1"); await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const oldFetch = globalThis.fetch;
  const sent: any[] = []; let courierFails = false; let mailFails = false;
  globalThis.fetch = (async (url, init) => {
    const target = String(url);
    if (target.startsWith(base)) return oldFetch(url, init);
    if (target.endsWith("/auth/login")) return Response.json({ token: "mock-token" });
    if (target.includes('/orders/show/')) { const id = decodeURIComponent(target.split('/').pop()!); return Response.json({ data: { id, channel_order_id: id, shipments: { id: `shipment-${id}`, awb: null, weight: 1, length: 10, breadth: 10, height: 10 }, status: 'NEW' } }); }
    if (target.endsWith("/courier/assign/awb")) return Response.json(courierFails ? { response: {} } : { response: { data: { awb_code: "QA123", courier_name: "Test Courier" } } });
    if (target === "https://api.resend.com/emails") {
      sent.push({ payload: JSON.parse(init!.body as string), key: new Headers(init!.headers).get("Idempotency-Key") });
      return mailFails ? Response.json({ name: "validation_error", message: "Simulated delivery failure" }, { status: 403 }) : Response.json({ id: "mock-mail" });
    }
    throw new Error(`Unexpected network request: ${target}`);
  }) as typeof fetch;
  const create = async (shipment: boolean) => {
    const order = await storage.createOrder({ ...address, userId: buyer.id, subtotal: "70.00", shippingCharge: "70.00", total: "140.00" }, []);
    await storage.markOrderPaid(order.id, "mock-paid");
    if (shipment) await storage.updateOrderShipping(order.id, { shiprocketOrderId: order.id, shiprocketShipmentId: `shipment-${order.id}` });
    await saveShippingPlan({ id: order.id, orderId: order.id, parcel: { weightKg: 1, lengthCm: 10, breadthCm: 10, heightCm: 10, shippingMode: 'Surface' }, fingerprint: shippingFingerprint(order), expiresAt: new Date(Date.now()+60000).toISOString(), warnings: [], rates: [{id: 'shiprocket:1', provider: 'shiprocket', service: 'Test Courier', amount: 50, currency: 'INR', chargeableWeightKg: 1, courierId: 1, taxNote: 'Fixture'}] });
    return order;
  };
  const assign = (id: string) => fetch(`${base}/api/admin/orders/${id}/assign-courier`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: id, rateId: "shiprocket:1" }) });
  try {
    const missing = await create(false);
    assert.equal((await assign(missing.id)).status, 400); assert.equal(sent.length, 0);
    const order = await create(true);
    const response = await assign(order.id);
    assert.equal(response.status, 200); assert.equal((await response.json()).status, "paid");
    assert.equal(sent.length, 2);
    const customerMail = sent.find(mail => mail.payload.to === buyer.email);
    const adminMail = sent.find(mail => Array.isArray(mail.payload.to));
    assert.ok(customerMail.payload.text.includes("Test Courier")); assert.ok(customerMail.key.includes(order.id));
    assert.deepEqual(adminMail.payload.to, ["qa-admin@example.test", "khandelwalshubham5775@gmail.com"]);
    assert.ok(adminMail.payload.text.includes("QA123"));
    assert.ok(adminMail.payload.text.includes("Test address"));
    assert.notEqual(adminMail.key, customerMail.key);
    assert.ok(!JSON.stringify(customerMail.payload).includes("khandelwalshubham5775@gmail.com"));
    assert.equal((await assign(order.id)).status, 400); assert.equal(sent.length, 2);
    courierFails = true;
    assert.equal((await assign((await create(true)).id)).status, 502); assert.equal(sent.length, 2);
    courierFails = false; mailFails = true;
    const emailFailure = await create(true);
    assert.equal((await assign(emailFailure.id)).status, 200);
    assert.equal((await storage.getOrderById(emailFailure.id))?.awbCode, "QA123");
  } finally {
    globalThis.fetch = oldFetch;
    await new Promise<void>(resolve => server.close(() => resolve()));
    for (const key of ["RESEND_API_KEY", "ADMIN_EMAILS", "SHIPROCKET_EMAIL", "SHIPROCKET_PASSWORD", "ADMIN_EMAIL", "ADMIN_NOTIFICATION_EMAILS"]) {
      if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
    }
  }
});
