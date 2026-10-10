import type { Order, OrderItem } from "@shared/schema";

/**
 * Fires the admin, customer and Telegram notification channels for a newly-paid order. Each channel
 * fails independently and silently (logged, not thrown) — a broken email
 * or Telegram setup should never break the actual checkout flow for the
 * customer. Call this AFTER the order is already marked paid in the DB.
 */
export async function notifyNewOrder(order: Order, items: OrderItem[]) {
  await Promise.allSettled([
    sendOrderEmail(order, items),
    notifyCustomer(order, items),
    sendTelegramMessage(order, items),
  ]);
}

async function notifyCustomer(order: Order, items: OrderItem[]) {
  try {
    const { storage } = await import("./storage");
    const customer = await storage.getUserById(order.userId);
    if (!customer?.email) throw new Error("Order customer has no email address");
    const { sendCustomerOrderEmail } = await import("./customerOrderEmail");
    await sendCustomerOrderEmail(order, items, customer.email);
  } catch (error) {
    console.error(`[notifications] Customer confirmation failed for order ${order.id}:`, error);
  }
}

function formatOrderSummary(order: Order, items: OrderItem[]): string {
  const itemLines = items
    .map((item) => `  • ${item.productName} × ${item.quantity} — ₹${item.unitPrice}`)
    .join("\n");

  return (
    `New paid order #${order.id.slice(0, 8)}\n` +
    `Subtotal: ₹${order.subtotal}\nShipping: ₹${order.shippingCharge}\nDiscount: ₹${order.discountAmount}${order.promoCode ? ` (${order.promoCode})` : ""}\nTotal: ₹${order.total}\n\n` +
    `Items:\n${itemLines}\n\n` +
    `Ship to:\n` +
    `${order.shippingName} · ${order.shippingPhone}\n` +
    `${order.shippingAddressLine1}` +
    `${order.shippingAddressLine2 ? ", " + order.shippingAddressLine2 : ""}\n` +
    `${order.shippingCity}, ${order.shippingState} - ${order.shippingPincode}`
  );
}

async function sendOrderEmail(order: Order, items: OrderItem[]) {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!apiKey || !adminEmail) {
    console.warn(
      "[notifications] RESEND_API_KEY or ADMIN_EMAIL not set — skipping order email.",
    );
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const itemRows = items
      .map(
        (item) =>
          `<tr><td style="padding:4px 8px;">${item.productName}</td>` +
          `<td style="padding:4px 8px;">×${item.quantity}</td>` +
          `<td style="padding:4px 8px;">₹${item.unitPrice}</td></tr>`,
      )
      .join("");

    const { error } = await resend.emails.send({
      // This sender domain must be verified in Resend.
      from: "The Crunch Era <orders@thecrunchera.com>",
      to: adminEmail,
      subject: `New order — ₹${order.total} (#${order.id.slice(0, 8)})`,
      html: `
        <h2>New paid order</h2>
        <p><strong>Order:</strong> #${order.id.slice(0, 8)}</p>
        <p>Subtotal: ₹${order.subtotal} · Shipping: ₹${order.shippingCharge} · Discount: ₹${order.discountAmount}</p>
        <p><strong>Total:</strong> ₹${order.total}</p>
        <table style="border-collapse:collapse;">${itemRows}</table>
        <h3>Ship to</h3>
        <p>
          ${order.shippingName}<br/>
          ${order.shippingPhone}<br/>
          ${order.shippingAddressLine1}${order.shippingAddressLine2 ? ", " + order.shippingAddressLine2 : ""}<br/>
          ${order.shippingCity}, ${order.shippingState} - ${order.shippingPincode}
        </p>
      `,
    }, { idempotencyKey: `admin-order-paid/${order.id}` });
    if (error) throw new Error(`${error.name}: ${error.message}`);
  } catch (error) {
    console.error("[notifications] Failed to send order email:", error);
  }
}

async function sendTelegramMessage(order: Order, items: OrderItem[]) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn(
      "[notifications] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping Telegram alert.",
    );
    return;
  }

  try {
    const text = formatOrderSummary(order, items);
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      console.error("[notifications] Telegram API error:", res.status, body);
    }
  } catch (error) {
    console.error("[notifications] Failed to send Telegram message:", error);
  }
}


/** Email failure must not undo a successfully purchased courier assignment. */
export async function notifyCourierAssigned(order: Order) {
  try {
    const { storage } = await import("./storage");
    const customer = await storage.getUserById(order.userId);
    if (!customer?.email) throw new Error("Order customer has no email address");
    const { sendCustomerShipmentEmail } = await import("./customerShipmentEmail");
    await sendCustomerShipmentEmail(order, customer.email);
  } catch (error) {
    console.error(`[notifications] Shipping email failed for order ${order.id}:`, error);
  }
}
