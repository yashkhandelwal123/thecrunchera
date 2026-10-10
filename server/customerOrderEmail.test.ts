import { test } from "node:test";
import assert from "node:assert/strict";
import { customerOrderEmail, sendCustomerOrderEmail, CUSTOMER_ORDER_SUBJECT } from "./customerOrderEmail";
import { storage } from "./storage";
import { notifyNewOrder } from "./notifications";
import type { Order, OrderItem } from "../shared/schema";

const order = {
  id: "private-order-id", userId: "customer-id", status: "paid", razorpayPaymentId: "payment-verified",
  createdAt: new Date("2026-10-10T12:00:00Z"), shippingName: "Yash <script>",
  shippingAddressLine1: "A & B", shippingAddressLine2: null, shippingCity: "Jaipur", shippingState: "Rajasthan", shippingPincode: "302001",
  subtotal: "490.00", shippingCharge: "0.00", discountAmount: "49.00", total: "441.00",
} as Order;
const items = [{ productName: "Ragi & Oats", unitPrice: "70.00", quantity: 7 }] as OrderItem[];

test("approved template has exact subject, totals, escaped content and no order number", () => {
  const email = customerOrderEmail(order, items, "support@example.test");
  assert.equal(email.subject, "Your The Crunch Era order is confirmed! 🎉");
  for (const body of [email.html, email.text]) {
    assert.ok(!body.includes(order.id)); assert.ok(!/order (number|#)/i.test(body));
    for (const value of ["₹490.00", "₹49.00", "₹441.00", "Free", "Paid", "support@example.test"]) assert.ok(body.includes(value));
  }
  assert.ok(email.html.includes("Yash &lt;script&gt;")); assert.ok(!email.html.includes("Yash <script>"));
  const plain = customerOrderEmail({ ...order, discountAmount: "0.00", shippingCharge: "70.00", total: "560.00" }, items);
  assert.ok(!plain.text.includes("Discount:")); assert.ok(!plain.html.includes(">Discount<"));
  assert.ok(plain.text.includes("Shipping: ₹70.00")); assert.ok(plain.text.includes("/contact"));
});

test("customer delivery uses customer recipient and stable key; failures are surfaced; unpaid orders never send", async () => {
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "re_test_not_real";
  const sent: { payload: any; key: string | null }[] = [];
  globalThis.fetch = (async (_url, init) => {
    sent.push({ payload: JSON.parse(init!.body as string), key: new Headers(init!.headers).get("Idempotency-Key") });
    return Response.json({ id: "test-email" });
  }) as typeof fetch;
  try {
    await sendCustomerOrderEmail({ ...order, status: "pending" }, items, "buyer@example.test");
    await sendCustomerOrderEmail({ ...order, razorpayPaymentId: null }, items, "buyer@example.test");
    assert.equal(sent.length, 0);
    await sendCustomerOrderEmail(order, items, "buyer@example.test");
    assert.equal(sent[0].payload.to, "buyer@example.test");
    assert.equal(sent[0].payload.subject, CUSTOMER_ORDER_SUBJECT);
    assert.equal(sent[0].key, `customer-order-confirmed/${order.id}`);
    globalThis.fetch = (async () => Response.json({ name: "validation_error", message: "Domain not verified" }, { status: 403 })) as typeof fetch;
    await assert.rejects(sendCustomerOrderEmail(order, items, "buyer@example.test"), /Domain not verified/);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = oldKey;
  }
});

test("atomic paid transition has one winner; customer and admin delivery are independent", async () => {
  const customer = await storage.createUser({ googleId: "qa-customer-confirmation", email: "customer@example.test", name: "QA Buyer" });
  const pending = await storage.createOrder({ ...order, userId: customer.id, shippingPhone: "9999999999" }, items);
  const results = await Promise.all([storage.markOrderPaid(pending.id, "pay_qa"), storage.markOrderPaid(pending.id, "pay_qa")]);
  assert.equal(results.filter(Boolean).length, 1);
  const paid = results.find(Boolean)!;
  const oldFetch = globalThis.fetch;
  const saved = { ...process.env };
  const sent: any[] = [];
  process.env.RESEND_API_KEY = "re_test_not_real"; process.env.ADMIN_EMAIL = "owner@example.test";
  delete process.env.TELEGRAM_BOT_TOKEN;
  globalThis.fetch = (async (_url, init) => {
    const payload = JSON.parse(init!.body as string); sent.push(payload);
    return payload.to.includes("owner@example.test")
      ? Response.json({ name: "validation_error", message: "Simulated admin rejection" }, { status: 403 })
      : Response.json({ id: "test-customer-email" });
  }) as typeof fetch;
  try {
    await notifyNewOrder(paid, items);
    assert.equal(sent.length, 2);
    assert.equal(sent.filter(p => p.to.includes(customer.email)).length, 1);
    assert.equal(sent.find(p => p.to.includes(customer.email)).subject, CUSTOMER_ORDER_SUBJECT);
    await storage.updateOrderStatus(pending.id, "shipped");
    assert.equal(await storage.markOrderPaid(pending.id, "pay_qa"), undefined);
    assert.equal((await storage.getOrderById(pending.id))?.status, "shipped");
  } finally {
    globalThis.fetch = oldFetch;
    for (const key of ["RESEND_API_KEY", "ADMIN_EMAIL", "TELEGRAM_BOT_TOKEN"]) {
      if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
    }
  }
});
