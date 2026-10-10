import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { parcelSchema, buildDelhiveryPayload, checkDelhiveryServiceability } from "./delhivery";
import { customerShipmentEmail } from "./customerShipmentEmail";
import type { Order, OrderItem } from "../shared/schema";

const address = { shippingName: "QA & Buyer", shippingPhone: "9999999999", shippingAddressLine1: "A&B; #12", shippingCity: "Jaipur", shippingState: "Rajasthan", shippingPincode: "302001" };
const parcel = { weightKg: 0.55, lengthCm: 25, breadthCm: 20, heightCm: 12, shippingMode: "Surface" };
const item = { productId: "qa-product", productName: "Ragi Chips", productImage: "/qa.png", unitPrice: "70.00", quantity: 7 };

test("parcel validation, gram conversion and exact stored total; no invented tax or invoice", () => {
  const packed = parcelSchema.parse(parcel);
  const payload = buildDelhiveryPayload({ ...address, id: "qa-order", total: "441.00" } as Order, [item] as OrderItem[], packed, "Exact Warehouse");
  assert.equal(payload.shipments[0].weight, "550");
  assert.equal(payload.shipments[0].total_amount, "441.00");
  assert.equal(payload.shipments[0].cod_amount, "0");
  assert.equal(payload.shipments[0].quantity, "7");
  assert.equal(payload.pickup_location.name, "Exact Warehouse");
  for (const bad of [0, -1, "", "NaN", Infinity]) assert.equal(parcelSchema.safeParse({ ...parcel, weightKg: bad }).success, false);
});

test("Delhivery routes: admin-only, disabled setup, safe booking, provider isolation, tracking, duplicate prevention and failures", async () => {
  const saved = { ...process.env };
  Object.assign(process.env, { DELHIVERY_ENABLED: "true", DELHIVERY_ENVIRONMENT: "production", DELHIVERY_API_TOKEN: "mock-token", DELHIVERY_PICKUP_LOCATION: "Exact Warehouse", ADMIN_EMAILS: "del-admin@example.test", ADMIN_EMAIL: "owner@example.test", RESEND_API_KEY: "re_mock" });
  const admin = await storage.createUser({ googleId: "del-admin", name: "QA Admin", email: "del-admin@example.test" });
  const buyer = await storage.createUser({ googleId: "del-buyer", name: "QA Buyer", email: "del-buyer@example.test" });
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { req.session = { userId: req.headers["x-qa-admin"] ? admin.id : buyer.id } as typeof req.session; next(); });
  const server = await registerRoutes(app); server.listen(0, "127.0.0.1"); await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const oldFetch = globalThis.fetch;
  const sent: any[] = []; let manifests = 0; let mode = "ok"; let serviceable = true; let trackedAwb = "123456789012";
  globalThis.fetch = (async (url, init) => {
    const target = String(url);
    if (target.startsWith(base)) return oldFetch(url, init);
    if (target.includes("api.resend.com")) { sent.push(JSON.parse(init!.body as string)); return Response.json({ id: "mock-email" }); }
    assert.ok(target.startsWith("https://track.delhivery.com/") || target.startsWith("https://staging-express.delhivery.com/"));
    assert.equal(new Headers(init!.headers).get("Authorization"), "Token mock-token");
    if (target.includes("pin-codes")) return Response.json({ delivery_codes: serviceable ? [{ postal_code: { pin: 302001, pre_paid: "Y", remarks: "" } }] : [] });
    if (target.includes("cmu/create")) {
      manifests++;
      const encoded = new URLSearchParams(init!.body as string);
      assert.equal(encoded.get("format"), "json");
      const payload = JSON.parse(encoded.get("data")!);
      assert.equal(payload.shipments[0].add, "A&B; #12"); assert.equal(payload.shipments[0].weight, "550");
      if (mode === "empty") return new Response("");
      if (mode === "html") return new Response("<html>Error</html>");
      if (mode === "network") throw new Error("Simulated network error");
      if (mode === "rejected") return Response.json({ success: false, packages: [] });
      trackedAwb = String(123456789000 + manifests);
      return Response.json({ success: true, packages: [{ status: "Success", waybill: trackedAwb, refnum: payload.shipments[0].order }] });
    }
    if (target.includes("packages/json")) return Response.json({ ShipmentData: [{ Shipment: { AWB: trackedAwb, Status: { Status: "In Transit" } } }] });
    throw Error("Unexpected test request");
  }) as typeof fetch;
  const create = async () => {
    const order = await storage.createOrder({ ...address, userId: buyer.id, subtotal: "490.00", shippingCharge: "0.00", discountAmount: "49.00", total: "441.00" }, [item]);
    await storage.markOrderPaid(order.id, "mock-payment"); return order;
  };
  const post = (id: string, action = "create-delhivery-shipment", body: unknown = parcel, auth = true) => fetch(`${base}/api/admin/orders/${id}/${action}`, { method: "POST", headers: { "Content-Type": "application/json", ...(auth ? { "x-qa-admin": "1" } : {}) }, body: JSON.stringify(body) });
  try {
    const order = await create();
    assert.equal((await post(order.id, undefined, parcel, false)).status, 403);
    assert.equal((await post(order.id, undefined, { ...parcel, weightKg: 0 })).status, 400);
    process.env.DELHIVERY_ENABLED = "false"; assert.equal((await post(order.id)).status, 400); process.env.DELHIVERY_ENABLED = "true";
    serviceable = false; assert.equal((await post(order.id)).status, 400); serviceable = true; assert.equal(manifests, 0);
    const concurrent = await Promise.all([post(order.id), post(order.id)]);
    assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409]); assert.equal(manifests, 1);
    const booked = await storage.getOrderById(order.id);
    assert.equal(booked?.shippingProvider, "delhivery"); assert.equal(booked?.shiprocketShipmentId, null); assert.equal(booked?.shipmentBookingState, "created");
    assert.ok(booked?.trackingUrl?.startsWith("https://www.delhivery.com/track/package/"));
    assert.equal(sent.length, 2); assert.ok(sent.every(mail => mail.text.includes("delhivery.com/track/package/")));
    assert.ok(!customerShipmentEmail(booked!).text.includes("shiprocket.co"));
    assert.equal((await post(order.id, "create-shipment")).status, 409); assert.equal((await post(order.id, "assign-courier")).status, 400);
    const refreshed = await post(order.id, "refresh-tracking"); assert.equal(refreshed.status, 200); assert.equal((await refreshed.json()).shippingStatus, "In Transit");
    assert.equal(sent.length, 2);
    const shiprocketOrder = await create(); await storage.updateOrderShipping(shiprocketOrder.id, { shiprocketShipmentId: "existing-shiprocket" });
    assert.equal((await post(shiprocketOrder.id)).status, 409);
    for (const failure of ["empty", "html", "network", "rejected"]) {
      mode = failure; const failed = await create(); const response = await post(failed.id);
      assert.equal(response.status, 502); assert.ok(!JSON.stringify(await response.json()).includes("JSON.parse"));
      assert.equal((await storage.getOrderById(failed.id))?.shipmentBookingState, "needs_review");
      const calls = manifests; assert.equal((await post(failed.id)).status, 409); assert.equal(manifests, calls);
    }
    assert.equal(sent.length, 2);
    mode = "ok"; process.env.DELHIVERY_ENVIRONMENT = "staging";
    const sandbox = await create(); assert.equal((await post(sandbox.id)).status, 200); assert.equal(sent.length, 2);
    process.env.DELHIVERY_ENVIRONMENT = "production"; assert.equal((await post(sandbox.id, "refresh-tracking")).status, 500);
  } finally {
    globalThis.fetch = oldFetch; await new Promise<void>(resolve => server.close(() => resolve()));
    for (const key of ["DELHIVERY_ENABLED", "DELHIVERY_ENVIRONMENT", "DELHIVERY_API_TOKEN", "DELHIVERY_PICKUP_LOCATION", "ADMIN_EMAILS", "ADMIN_EMAIL", "RESEND_API_KEY"]) {
      if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
    }
  }
});
